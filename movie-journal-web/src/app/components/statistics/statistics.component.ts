import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ActorsStatisticResponse } from '../../models/statistic.model';
import { StatisticService } from '../../services/statistic.service';
import { countryFlag, countryName } from '../../utils/country.util';

type StatisticsTab = 'actors';

/** Розмір вікової групи (ageGap): межі слайдера й значення за замовчуванням (збігається з типовим на бекенді). */
const MIN_AGE_GAP = 1;
const MAX_AGE_GAP = 20;
const DEFAULT_AGE_GAP = 5;
const COLLAPSED_NATIONALITIES = 10;

interface Bar {
    key: string;
    label: string;
    flag?: string;
    count: number;
    /** Ширина/висота смуги відносно найбільшого значення, %. */
    size: number;
    /** Частка від усіх акторів, %. */
    share: number;
}

const percent = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

@Component({
    selector: 'app-statistics',
    standalone: true,
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsComponent implements OnInit {
    private readonly statisticService = inject(StatisticService);
    private readonly destroyRef = inject(DestroyRef);

    readonly tabs: { id: StatisticsTab; label: string }[] = [
        { id: 'actors', label: 'Актори' }
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

    readonly isEmpty = computed(() => !this.loading() && !this.hasError() && this.total() === 0);

    ngOnInit(): void {
        this.load();
    }

    selectTab(tab: StatisticsTab): void {
        this.activeTab.set(tab);
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

    toggleNationalities(): void {
        this.showAllNationalities.update(v => !v);
    }
}