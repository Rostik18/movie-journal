import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { MediaType, MediaTypeLabels, WatchStatus, WatchStatusLabels } from '../../models/enums';
import { ActorsStatisticResponse, MediaStatisticResponse, UserWatchingStatisticResponse } from '../../models/statistic.model';
import { StatisticService } from '../../services/statistic.service';
import { countryFlag, countryName } from '../../utils/country.util';

type StatisticsTab = 'actors' | 'media' | 'watching';

/** Розмір вікової групи (ageGap): межі слайдера й значення за замовчуванням (збігається з типовим на бекенді). */
const MIN_AGE_GAP = 1;
const MAX_AGE_GAP = 20;
const DEFAULT_AGE_GAP = 5;
const COLLAPSED_NATIONALITIES = 10;
const COLLAPSED_TOP = 10;
const RATINGS = Array.from({ length: 10 }, (_, i) => i + 1);

interface Bar {
    key: string;
    label: string;
    flag?: string;
    count: number;
    /** Ширина/висота смуги відносно найбільшого значення, %. */
    size: number;
    /** Частка від усіх акторів, %. */
    share: number;
    /** Повна назва для підказки (місяць). */
    fullLabel?: string;
}

const MONTHS: readonly { short: string; full: string }[] = [
    { short: 'Січ', full: 'Січень' },
    { short: 'Лют', full: 'Лютий' },
    { short: 'Бер', full: 'Березень' },
    { short: 'Кві', full: 'Квітень' },
    { short: 'Тра', full: 'Травень' },
    { short: 'Чер', full: 'Червень' },
    { short: 'Лип', full: 'Липень' },
    { short: 'Сер', full: 'Серпень' },
    { short: 'Вер', full: 'Вересень' },
    { short: 'Жов', full: 'Жовтень' },
    { short: 'Лис', full: 'Листопад' },
    { short: 'Гру', full: 'Грудень' }
];

const percent = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

/** Словник «ключ → кількість» у смуги: за спаданням кількості (за рівності — за підписом). */
function recordToBars(
    record: Record<string, number> | null | undefined,
    total: number,
    label: (key: string) => string = key => key
): Bar[] {
    const entries = Object.entries(record ?? {}).sort(([keyA, a], [keyB, b]) => b - a || label(keyA).localeCompare(label(keyB), 'uk'));
    const max = entries[0]?.[1] ?? 0;

    return entries.map(([key, count]) => ({
        key,
        label: label(key),
        count,
        size: percent(count, max),
        share: percent(count, total)
    }));
}

/** Колонки в заданому порядку ключів; ключі без значення — 0. Висота — відносно найбільшого значення. */
function recordToColumns(
    record: Record<string, number> | null | undefined,
    keys: readonly string[],
    total: number,
    label: (key: string) => string = key => key
): Bar[] {
    const counts = keys.map(key => record?.[key] ?? 0);
    const max = Math.max(0, ...counts);

    return keys.map((key, index) => ({
        key,
        label: label(key),
        count: counts[index],
        size: percent(counts[index], max),
        share: percent(counts[index], total)
    }));
}

/** Безперервний діапазон цілих від мінімального до максимального ключа (напр. роки без фільмів = 0). */
function integerRange(record: Record<string, number> | null | undefined, step = 1): string[] {
    const values = Object.keys(record ?? {}).map(Number).filter(Number.isFinite);
    if (values.length === 0) {
        return [];
    }
    const keys: string[] = [];
    for (let value = Math.min(...values); value <= Math.max(...values); value += step) {
        keys.push(String(value));
    }
    return keys;
}

/** Безперервний діапазон місяців «yyyy-MM» від найранішого до найпізнішого. */
function monthRange(...records: (Record<string, number> | null | undefined)[]): string[] {
    const all = records.flatMap(r => Object.keys(r ?? {})).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
    if (all.length === 0) {
        return [];
    }
    const [firstYear, firstMonth] = all[0].split('-').map(Number);
    const [lastYear, lastMonth] = all[all.length - 1].split('-').map(Number);

    const keys: string[] = [];
    for (let year = firstYear, month = firstMonth; year < lastYear || (year === lastYear && month <= lastMonth);) {
        keys.push(`${year}-${String(month).padStart(2, '0')}`);
        if (++month > 12) {
            month = 1;
            year++;
        }
    }
    return keys;
}

interface MonthColumn {
    key: string;
    label: string;
    started: number;
    finished: number;
    startedSize: number;
    finishedSize: number;
}

/** Стан вкладки: дані, завантаження, помилка; запит скасовується, якщо стартує новий. */
interface TabState<T> {
    data: WritableSignal<T | null>;
    loading: WritableSignal<boolean>;
    hasError: WritableSignal<boolean>;
    load(): void;
}

@Component({
    selector: 'app-statistics',
    standalone: true,
    imports: [NgTemplateOutlet],
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsComponent implements OnInit {
    private readonly statisticService = inject(StatisticService);
    private readonly destroyRef = inject(DestroyRef);

    readonly tabs: { id: StatisticsTab; label: string }[] = [
        { id: 'actors', label: 'Актори' },
        { id: 'media', label: 'Медіа' },
        { id: 'watching', label: 'Мій перегляд' }
    ];
    readonly activeTab = signal<StatisticsTab>('actors');

    readonly actors = signal<ActorsStatisticResponse | null>(null);
    readonly loading = signal(true);
    readonly hasError = signal(false);

    readonly showAllNationalities = signal(false);

    // ---------- Розмір вікової групи ----------
    readonly minAgeGap = MIN_AGE_GAP;
    readonly maxAgeGap = MAX_AGE_GAP;
    /** Значення під час перетягування слайдера (лише показується). */
    readonly ageGapDraft = signal(DEFAULT_AGE_GAP);
    /** Значення, яке використано для запиту: за ним будуються підписи груп. */
    private readonly loadedAgeGap = signal(DEFAULT_AGE_GAP);
    private request: Subscription | null = null;
    /** «по 1 року», «по 3 роки», «по 5 років» (діапазон 1–20, тож винятків 11–14 достатньо врахувати нижче). */
    readonly ageGapUnit = computed(() => {
        const gap = this.ageGapDraft();
        const lastDigit = gap % 10;
        if (gap > 10 && gap < 15) {
            return 'років';
        }
        if (lastDigit === 1) {
            return 'року';
        }
        return lastDigit >= 2 && lastDigit <= 4 ? 'роки' : 'років';
    });

    // ---------- Актори ----------
    readonly total = computed(() => this.actors()?.totalActors ?? 0);

    readonly gender = computed(() => {
        const data = this.actors();
        const total = data?.totalActors ?? 0;
        const male = data?.maleActors ?? 0;
        const female = data?.femaleActors ?? 0;
        const unspecified = Math.max(total - male - female, 0);

        return [
            { key: 'male', label: 'Чоловіки', count: male, share: percent(male, total) },
            { key: 'female', label: 'Жінки', count: female, share: percent(female, total) },
            { key: 'unspecified', label: 'Стать не вказано', count: unspecified, share: percent(unspecified, total) }
        ];
    });

    private readonly allNationalities = computed<Bar[]>(() => {
        const data = this.actors();
        if (!data) {
            return [];
        }

        const entries = Object.entries(data.countByNationality ?? {})
            .sort(([codeA, a], [codeB, b]) => b - a || countryName(codeA).localeCompare(countryName(codeB), 'uk'));
        const max = entries[0]?.[1] ?? 0;

        return entries.map(([code, count]) => ({
            key: code,
            label: countryName(code),
            flag: countryFlag(code),
            count,
            size: percent(count, max),
            share: percent(count, data.totalActors)
        }));
    });

    readonly nationalitiesCount = computed(() => this.allNationalities().length);
    readonly canToggleNationalities = computed(() => this.nationalitiesCount() > COLLAPSED_NATIONALITIES);
    readonly nationalities = computed(() =>
        this.showAllNationalities() ? this.allNationalities() : this.allNationalities().slice(0, COLLAPSED_NATIONALITIES)
    );

    /** Віковий розподіл: суцільний ряд блоків від наймолодшого до найстаршого (порожні блоки = 0). */
    readonly ageBars = computed<Bar[]>(() => {
        const data = this.actors();
        if (!data) {
            return [];
        }

        const counts = new Map(
            Object.entries(data.countByAge ?? {})
                .map(([start, count]) => [Number(start), count] as const)
                .filter(([start]) => Number.isFinite(start))
        );
        if (counts.size === 0) {
            return [];
        }

        const starts = [...counts.keys()];
        const first = Math.min(...starts);
        const last = Math.max(...starts);
        const max = Math.max(...counts.values());

        const bars: Bar[] = [];
        const gap = this.loadedAgeGap();
        for (let start = first; start <= last; start += gap) {
            const count = counts.get(start) ?? 0;
            bars.push({
                key: String(start),
                label: gap === 1 ? `${start}` : `${start}–${start + gap - 1}`,
                count,
                size: percent(count, max),
                share: percent(count, data.totalActors)
            });
        }
        return bars;
    });

    /**
     * Місяць народження: завжди всі 12 місяців по порядку; місяці, яких бекенд не повернув
     * (немає акторів), показуємо як 0. Без жодного значення блок не відображається.
     */
    readonly monthBars = computed<Bar[]>(() => {
        const data = this.actors();
        if (!data) {
            return [];
        }

        const counts = new Map<number, number>();
        for (const [key, count] of Object.entries(data.countByMonth ?? {})) {
            const month = Number(key);
            if (Number.isInteger(month) && month >= 1 && month <= 12) {
                counts.set(month, (counts.get(month) ?? 0) + count);
            }
        }
        if (counts.size === 0) {
            return [];
        }

        const max = Math.max(...counts.values());
        return MONTHS.map((name, index) => {
            const count = counts.get(index + 1) ?? 0;
            return {
                key: String(index + 1),
                label: name.short,
                fullLabel: name.full,
                count,
                size: percent(count, max),
                share: percent(count, data.totalActors)
            };
        });
    });

    // ---------- Медіа ----------
    private createTabState<T>(fetch: () => Observable<T>): TabState<T> {
        const data = signal<T | null>(null);
        const loading = signal(false);
        const hasError = signal(false);
        let request: Subscription | null = null;

        return {
            data,
            loading,
            hasError,
            load: () => {
                loading.set(true);
                hasError.set(false);
                request?.unsubscribe();
                request = fetch().pipe(
                    finalize(() => loading.set(false)),
                    takeUntilDestroyed(this.destroyRef)
                ).subscribe({
                    next: result => data.set(result),
                    error: () => hasError.set(true)
                });
            }
        };
    }

    readonly mediaState = this.createTabState<MediaStatisticResponse>(() => this.statisticService.getMediaStatistics());
    readonly watchingState = this.createTabState<UserWatchingStatisticResponse>(() => this.statisticService.getUserWatchingStatistics());

    readonly mediaStats = this.mediaState.data;
    readonly mediaTotal = computed(() => this.mediaStats()?.totalMedia ?? 0);
    readonly mediaIsEmpty = computed(() => !!this.mediaStats() && this.mediaTotal() === 0);

    readonly posterKpi = computed(() => {
        const data = this.mediaStats();
        const total = this.mediaTotal();
        return [
            { key: 'with', label: 'З постером', count: data?.countWithPoster ?? 0, share: percent(data?.countWithPoster ?? 0, total) },
            { key: 'without', label: 'Без постера', count: data?.countWithoutPoster ?? 0, share: percent(data?.countWithoutPoster ?? 0, total) }
        ];
    });

    private readonly typeLabel = (key: string): string => MediaTypeLabels[key as MediaType] ?? key;

    readonly mediaTypes = computed(() => recordToBars(this.mediaStats()?.countByType, this.mediaTotal(), this.typeLabel));

    /** Десятиліття по порядку без пропусків: «1990-ті». */
    readonly mediaDecades = computed(() => {
        const record = this.mediaStats()?.countByDecade;
        return recordToColumns(record, integerRange(record, 10), this.mediaTotal(), key => `${key}-ті`);
    });

    readonly mediaYears = computed(() => {
        const record = this.mediaStats()?.countByYear;
        return recordToColumns(record, integerRange(record), this.mediaTotal());
    });

    readonly showAllMediaGenres = signal(false);
    readonly showAllMediaTags = signal(false);
    private readonly allMediaGenres = computed(() => recordToBars(this.mediaStats()?.countByGenre, this.mediaTotal()));
    private readonly allMediaTags = computed(() => recordToBars(this.mediaStats()?.countByTag, this.mediaTotal()));
    readonly mediaGenresCount = computed(() => this.allMediaGenres().length);
    readonly mediaTagsCount = computed(() => this.allMediaTags().length);
    readonly mediaGenres = computed(() => this.showAllMediaGenres() ? this.allMediaGenres() : this.allMediaGenres().slice(0, COLLAPSED_TOP));
    readonly mediaTags = computed(() => this.showAllMediaTags() ? this.allMediaTags() : this.allMediaTags().slice(0, COLLAPSED_TOP));
    readonly collapsedTop = COLLAPSED_TOP;

    // ---------- Мій перегляд ----------
    readonly watchingStats = this.watchingState.data;
    readonly watchingTotal = computed(() => this.watchingStats()?.totalMedia ?? 0);
    readonly watchingIsEmpty = computed(() => !!this.watchingStats() && this.watchingTotal() === 0);

    readonly watchingKpi = computed(() => {
        const data = this.watchingStats();
        return {
            average: data?.averageRating != null ? data.averageRating.toFixed(1) : '—',
            completion: (data?.completionRate ?? 0).toFixed(1),
            drop: (data?.dropRate ?? 0).toFixed(1)
        };
    });

    /** Статуси у логічному порядку, а не за кількістю; відсутні = 0. */
    readonly watchingStatuses = computed<Bar[]>(() => {
        const record = this.watchingStats()?.countByStatus;
        const total = this.watchingTotal();
        const counts = Object.values(WatchStatus).map(status => record?.[status] ?? 0);
        const max = Math.max(0, ...counts);

        return Object.values(WatchStatus).map((status, index) => ({
            key: status,
            label: WatchStatusLabels[status],
            count: counts[index],
            size: percent(counts[index], max),
            share: percent(counts[index], total)
        }));
    });

    readonly watchingTypes = computed(() => recordToBars(this.watchingStats()?.countByType, this.watchingTotal(), this.typeLabel));

    /** Оцінки 1–10 усі по порядку; без оцінки відсотки рахуємо від кількості оцінених. */
    readonly watchingRatings = computed(() => {
        const record = this.watchingStats()?.countByRating;
        const rated = Object.values(record ?? {}).reduce((sum, count) => sum + count, 0);
        return rated === 0 ? [] : recordToColumns(record, RATINGS.map(String), rated);
    });

    readonly showAllWatchingGenres = signal(false);
    private readonly allWatchingGenres = computed(() => recordToBars(this.watchingStats()?.countByGenre, this.watchingTotal()));
    readonly watchingGenresCount = computed(() => this.allWatchingGenres().length);
    readonly watchingGenres = computed(() => this.showAllWatchingGenres() ? this.allWatchingGenres() : this.allWatchingGenres().slice(0, COLLAPSED_TOP));

    /** Почато / завершено по місяцях: безперервний діапазон «yyyy-MM», порожні місяці = 0. */
    readonly watchingMonths = computed<MonthColumn[]>(() => {
        const data = this.watchingStats();
        if (!data) {
            return [];
        }

        const keys = monthRange(data.countStartedByMonth, data.countFinishedByMonth);
        const max = Math.max(0, ...keys.flatMap(key => [data.countStartedByMonth?.[key] ?? 0, data.countFinishedByMonth?.[key] ?? 0]));

        return keys.map(key => {
            const started = data.countStartedByMonth?.[key] ?? 0;
            const finished = data.countFinishedByMonth?.[key] ?? 0;
            const [year, month] = key.split('-');
            return {
                key,
                label: `${month}.${year.slice(2)}`,
                started,
                finished,
                startedSize: percent(started, max),
                finishedSize: percent(finished, max)
            };
        });
    });

    readonly isEmpty = computed(() => !this.loading() && !this.hasError() && this.total() === 0);

    ngOnInit(): void {
        this.load();
    }

    selectTab(tab: StatisticsTab): void {
        this.activeTab.set(tab);

        // Вкладки «Медіа» та «Мій перегляд» вантажимо при першому відкритті
        const state = tab === 'media' ? this.mediaState : tab === 'watching' ? this.watchingState : null;
        if (state && !state.data() && !state.loading()) {
            state.load();
        }
    }

    load(ageGap = this.loadedAgeGap()): void {
        this.loading.set(true);
        this.hasError.set(false);

        // Попередній запит скасовуємо: відповідь на старий розмір групи не має перезаписати нову
        this.request?.unsubscribe();
        this.request = this.statisticService.getActorsStatistics(ageGap).pipe(
            finalize(() => this.loading.set(false)),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: data => {
                this.loadedAgeGap.set(ageGap);
                this.actors.set(data);
            },
            error: () => this.hasError.set(true)
        });
    }

    /** Під час руху слайдера лише оновлюємо число поруч. */
    onAgeGapInput(value: string): void {
        this.ageGapDraft.set(this.clampAgeGap(value));
    }

    /** Відпустили слайдер (або змінили значення з клавіатури) — завантажуємо статистику з новим розміром групи. */
    onAgeGapCommit(value: string): void {
        const gap = this.clampAgeGap(value);
        this.ageGapDraft.set(gap);
        if (gap !== this.loadedAgeGap()) {
            this.load(gap);
        }
    }

    private clampAgeGap(value: string): number {
        const parsed = Math.round(Number(value));
        if (!Number.isFinite(parsed)) {
            return this.loadedAgeGap();
        }
        return Math.min(MAX_AGE_GAP, Math.max(MIN_AGE_GAP, parsed));
    }

    toggle(flag: WritableSignal<boolean>): void {
        flag.update(v => !v);
    }

    toggleNationalities(): void {
        this.showAllNationalities.update(v => !v);
    }
}