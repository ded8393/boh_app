import { RefObject, forwardRef, memo, useCallback, useMemo } from "react"

import CardHeader from "@mui/material/CardHeader"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton, {
    ListItemButtonProps,
} from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"

import { PrincipleIcon } from "../components/Icon"
import {
    ItemsDrawerContextProvider,
    useItemsDrawer,
} from "../components/ItemsDrawer/context"
import { Principle } from "../gql/graphql"
import { AspectIconGroup } from "../routes/Aspects"
import { ItemFromQuery, VisibleItem } from "../types"
import { useUserDataContext } from "../userContext"

type AspectFromQuery = ItemFromQuery["aspects"][number]

interface ItemsProps {
    filters?: {
        known?: boolean
        aspects?: AspectFromQuery[]
        principles?: Principle[]
    }
    group?: string
}

export function setItemVisible(
    item: ItemFromQuery,
    visible: boolean,
    index = 0,
): VisibleItem {
    return { ...item, isVisible: visible, index: index }
}

function filterItems(
    state: ItemFromQuery[],
    filters: ItemsProps["filters"] = {},
): VisibleItem[] {
    let filteredState = state
    // now everything is visible
    if (filters.known) {
        filteredState = filteredState.filter(({ known }) => known)
    }
    // now, if we filtered by known, the unknown items are no longer visible
    if (filters.principles) {
        filteredState = filters.principles.flatMap((principle) =>
            filteredState
                .filter((item) => item[principle] > 0)
                // NB: this doesn't work with principles.length > 1
                .toSorted((a, b) => (b[principle] ?? 0) - (a[principle] ?? 0)),
        )
    }
    // now, if we filtered by principles, the items lacking one or more of the principles are no longer visible
    if (filters.aspects) {
        const aspects = new Set(filters.aspects.map((aspect) => aspect.id))
        filteredState = filteredState.filter((item) =>
            item.aspects.some(({ id }) => aspects.has(id)),
        )
    }
    // now, if we filtered by aspects, the items lacking one or more of the aspects are no longer visible
    // now we apply isVisible to all items which were filtered
    const filteredItems = filteredState.map(({ id }) => id)
    const filteredItemsSet = new Set(filteredItems)
    return state.map((item) =>
        setItemVisible(
            item,
            filteredItemsSet.has(item.id),
            filteredItems.indexOf(item.id),
        ),
    )
}

interface ItemPrincipleValueProps {
    principle: Principle
    value: number
}

const ItemPrincipleValue = ({ principle, value }: ItemPrincipleValueProps) => {
    return (
        <>
            <PrincipleIcon principle={principle} />
            <Typography
                variant="h6"
                sx={{
                    paddingInline: 1,
                }}
            >
                {value}
            </Typography>
        </>
    )
}

const ItemValues = ({ aspects, ...item }: ItemFromQuery) => (
    <Stack direction="row" alignItems="center" padding={2}>
        {Object.values(Principle)
            .filter((principle) => item[principle])
            .map((principle) => (
                <ItemPrincipleValue
                    key={principle}
                    principle={principle}
                    value={item[principle]!}
                />
            ))}
        <AspectIconGroup aspects={aspects} />
    </Stack>
)

export interface ItemProps extends ItemFromQuery {
    onToggleSelect?(id: string, selected: boolean): void
    sx?: ListItemButtonProps["sx"] | undefined
    group?: string
}

const Item = forwardRef<HTMLDivElement, ItemProps>(function Item(
    { onToggleSelect, sx, group, ...item },
    ref,
) {
    const { selected, dispatch } = useItemsDrawer()
    const handleToggleSelect = useCallback(() => {
        dispatch({
            type: "toggle",
            id: item.id,
            selected: !selected.has(item.id),
            group,
        })
        onToggleSelect?.(item.id, !selected)
    }, [dispatch, item.id, onToggleSelect, selected, group])
    return (
        <ListItem disablePadding>
            <ListItemButton
                ref={ref}
                selected={selected.has(item.id)}
                onClick={handleToggleSelect}
                sx={sx}
            >
                <ListItemText primary={item.name} />
                <ItemValues {...item} />
            </ListItemButton>
        </ListItem>
    )
})

interface ItemsListProps {
    items: VisibleItem[]
    itemRefs: RefObject<Map<string, RefObject<HTMLDivElement>>>
    group?: string
}

// This list is long, use memo to prevent rerendering
const ItemsList = memo(function ItemsList({
    items,
    itemRefs,
    group,
}: ItemsListProps) {
    if (items.length === 0)
        return <Typography>no items match search criteria</Typography>
    return (
        <List
            sx={{
                maxWidth: "sm",
                marginInline: "auto",
            }}
        >
            {items
                .toSorted((a, b) => a.index - b.index)
                .map((item) => (
                    <Item
                        key={item.id}
                        ref={itemRefs.current?.get(item.id)}
                        group={group}
                        {...item}
                    />
                ))}
        </List>
    )
})

interface SingleItemProps {
    itemId: string
}

export const SingleItemView = ({ itemId }: SingleItemProps) => {
    const { items } = useItemsDrawer()
    const item = items.find(({ id }) => id === itemId)
    if (item === undefined) return
    return (
        <div>
            <CardHeader title={item.name}></CardHeader>
            <ItemValues {...item} />
        </div>
    )
}

export const ItemsView = ({ filters, group }: ItemsProps) => {
    const { items, itemRefs } = useItemsDrawer()
    const { knownItems } = useUserDataContext()
    const knownItemsSet = useMemo(
        () => new Set(knownItems.map(({ id }) => id)),
        [knownItems],
    )
    const userKnownItems: ItemFromQuery[] = useMemo(
        () =>
            items.map((item) => {
                if (knownItemsSet.has(item.id)) return { ...item, known: true }
                return { ...item }
                // use baseline known value, as items that are not crafted cannot be "known" in this way
            }),
        [items, knownItemsSet],
    )
    const filteredItems = useMemo(
        () =>
            filterItems(userKnownItems, { known: true, ...filters }).filter(
                ({ isVisible }) => isVisible,
            ),
        [userKnownItems, filters],
    )
    return <ItemsList items={filteredItems} itemRefs={itemRefs} group={group} />
}

function AllItemsView({ filters }: ItemsProps) {
    return (
        <ItemsDrawerContextProvider>
            <ItemsView filters={filters} />
        </ItemsDrawerContextProvider>
    )
}

export default AllItemsView
