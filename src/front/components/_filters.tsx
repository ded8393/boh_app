import * as types from "../gql/graphql"
import { Principle } from "../types"

type HasAspect = types.Workstation_Slot | types.Item

function getAspects<T extends HasAspect>(datum: T): types.Aspect[] {
    if ("accepts" in datum) {
        return datum.accepts
    } else {
        return datum.aspects
    }
}

export function withAspects<T extends HasAspect>(
    data: { d: T }[],
): { d: T; aspects: types.Aspect[] }[] {
    return data.map(({ d }) => ({ d, aspects: getAspects(d) }))
}

type WithAspect<T extends HasAspect> = ReturnType<typeof withAspects<T>>[number]
type MaybeWithAspect<T extends HasAspect> = { d: T } & Partial<
    Pick<WithAspect<T>, "aspects">
>

const PRINCIPLES = [
    "edge",
    "forge",
    "grail",
    "heart",
    "knock",
    "lantern",
    "moon",
    "moth",
    "nectar",
    "rose",
    "scale",
    "sky",
    "winter",
] as const

type HasPrinciple =
    | types.Skill
    | types.SkillsQuery["skill"][number]
    | types.Item
    | types.ItemsQuery["item"][number]

export function getPrinciples<T extends HasPrinciple>(datum: T): Principle[] {
    if ("primary_principle" in datum) {
        return [datum.primary_principle, datum.secondary_principle]
    } else {
        let principles: Principle[] = []
        for (const principle of PRINCIPLES) {
            if (datum[principle]) {
                principles.push({ id: principle })
            }
        }
        return principles
    }
}

export function withPrinciples<T extends HasPrinciple>(
    data: { d: T }[],
): { d: T; principles: Principle[] }[] {
    return data.map(({ d }) => ({ d, principles: getPrinciples(d) }))
}

type WithPrinciple<T extends HasPrinciple> = ReturnType<
    typeof withPrinciples<T>
>[number]
type MaybeWithPrinciple<T extends HasPrinciple> = { d: T } & Partial<
    Pick<WithPrinciple<T>, "principles">
>

interface AspectFilter {
    aspects: types.Aspect[]
}

interface PrincipleFilter {
    principles: types.Principle[]
}

type FilterSet = Partial<AspectFilter> & Partial<PrincipleFilter>

interface FilterDataProps<
    F extends FilterSet,
    T extends (F extends AspectFilter ? HasAspect : {}) &
        (F extends PrincipleFilter ? HasPrinciple : {}),
> {
    data: T[]
    filters?: F
}

export function filterPrinciples<T extends HasPrinciple>(
    data: { d: T }[],
    principles: types.Principle[],
) {
    const filterPrinciples = principles.map((principle) => principle.id)
    return withPrinciples(data).filter((item) => {
        return item.principles.some(({ id }) => filterPrinciples.includes(id))
    })
}

export function filterAspects<T extends HasAspect>(
    data: { d: T }[],
    aspects: types.Aspect[],
) {
    const filterAspects = aspects.map((aspect) => aspect.id)
    return withAspects(data).filter((item) => {
        return item.aspects.some(({ id }) => filterAspects.includes(id))
    })
}

function filterData<
    F extends FilterSet,
    T extends (F extends AspectFilter ? HasAspect : {}) &
        (F extends PrincipleFilter ? HasPrinciple : {}),
>({ data, filters }: FilterDataProps<F, T>) {
    type Enriched = (T extends HasAspect ? MaybeWithAspect<T> : {}) &
        (T extends HasPrinciple ? MaybeWithPrinciple<T> : {})
    let filteredData: Enriched[] = data.map((d) => ({ d }))
    if (filters && filters.aspects) {
        const aspects = filters.aspects.map((aspect) => aspect.id)
        filteredData = withAspects(filteredData).filter((item) => {
            return item.aspects!.some(({ id }) => aspects.includes(id))
        })
    }
    if (filters?.principles) {
        const principles = filters.principles.map((principle) => principle.id)
        filteredData = withPrinciples(filteredData).filter((item) => {
            return item.principles.some(({ id }) => principles.includes(id))
        })
    }
    return filteredData
}
export default filterData
