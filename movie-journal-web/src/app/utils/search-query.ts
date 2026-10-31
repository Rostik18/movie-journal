/**
 * Розбір пошукового рядка з префіксом: «tag:космос», «жанр:драма», «автор: Нолан», «колекція: Marvel».
 *
 * Префікс (без урахування регістру) визначає, яким параметром API піде текст після двокрапки;
 * рядок без відомого префікса — це звичайний пошук (`defaultParam`). Невідомий префікс
 * (напр. «Star Wars: Episode IV») не вважається префіксом — весь текст іде в `defaultParam`.
 */
export type SearchPrefixRules<TParam extends string> = Record<TParam, readonly string[]>;

export interface ParsedSearch<TParam extends string> {
    param: TParam;
    /** Текст пошуку без префікса; порожній рядок, якщо після префікса нічого не введено. */
    value: string;
}

/** Приводить префікс до єдиного вигляду: нижній регістр, різні апострофи → «'». */
const normalizePrefix = (prefix: string): string => prefix.trim().toLowerCase().replace(/[’ʼ`]/g, "'");

export function parseSearchQuery<TParam extends string>(
    text: string,
    rules: SearchPrefixRules<TParam>,
    defaultParam: TParam
): ParsedSearch<TParam> {
    const trimmed = text.trim();
    const match = /^([^\s:]+)\s*:\s*(.*)$/s.exec(trimmed);

    if (match) {
        const prefix = normalizePrefix(match[1]);
        for (const param of Object.keys(rules) as TParam[]) {
            if (rules[param].some(alias => normalizePrefix(alias) === prefix)) {
                return { param, value: match[2].trim() };
            }
        }
    }

    return { param: defaultParam, value: trimmed };
}

/**
 * Параметри GET /api/media/search, які можна задати префіксом у рядку пошуку.
 * `*Id` — точний id сутності («колекціяid:abc123»), решта — пошук за назвою / ім'ям.
 */
export type MediaSearchTextParam =
    | 'query'
    | 'tag'
    | 'genre'
    | 'creator'
    | 'collection'
    | 'actor'
    | 'series'
    | 'creatorId'
    | 'collectionId'
    | 'actorId'
    | 'seriesId';

export const MEDIA_SEARCH_PREFIXES: SearchPrefixRules<MediaSearchTextParam> = {
    tag: ['tag', 'тег'],
    genre: ['genre', 'жанр'],
    creator: ['creator', 'творець', 'author', 'автор', 'producer', 'studio'],
    collection: ['collection', 'колекція'],
    actor: ['actor', 'актор'],
    series: ['series', 'серіал'],
    creatorId: ['creatorid', 'creator_id', 'творецьid', 'авторid', 'authorid'],
    collectionId: ['collectionid', 'collection_id', 'колекціяid'],
    actorId: ['actorid', 'actor_id', 'акторid'],
    seriesId: ['seriesid', 'series_id', 'серіалid'],
    query: ['name', 'title', 'description', "ім'я", 'назва', 'опис']
};

export const parseMediaSearch = (text: string): ParsedSearch<MediaSearchTextParam> =>
    parseSearchQuery(text, MEDIA_SEARCH_PREFIXES, 'query');