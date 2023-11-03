import { RefObject, useMemo } from "react"

import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import Drawer from "@mui/material/Drawer"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"

import Delete from "@mui/icons-material/Delete"

import { PrincipleIcon, PrincipleIconProps } from "../routes/Principles"
import { PRINCIPLES, PrincipleString, VisibleItem } from "../types"

interface PrincipleCounterProps extends PrincipleIconProps {
    principle: PrincipleString
    items: VisibleItem[]
}

function PrincipleCounter({
    principle,
    items,
    ...props
}: PrincipleCounterProps) {
    const total = items.reduce(
        (total, item) => total + (item[principle] ?? 0),
        0,
    )
    return total ? (
        <Stack direction="row" alignItems="center">
            <PrincipleIcon principle={principle} {...props} />
            <Typography variant="h6" sx={{ paddingInline: 1 }}>
                {total}
            </Typography>
        </Stack>
    ) : undefined
}

interface PrincipleCounterStackProps {
    items: VisibleItem[]
}

const PrincipleCounterStack = ({ items }: PrincipleCounterStackProps) =>
    items.length > 0 ? (
        <>
            <Typography variant="h6" sx={{ margin: 2 }}>
                Totals:
            </Typography>
            <Stack
                direction="row"
                spacing={2}
                flexWrap="wrap"
                sx={{ margin: 2 }}
            >
                {PRINCIPLES.map((principle) => (
                    <PrincipleCounter
                        key={principle}
                        principle={principle}
                        items={items}
                        sx={{ width: "2rem", height: "2rem" }}
                    />
                ))}
            </Stack>
        </>
    ) : undefined

interface ItemsDrawerProps {
    items: VisibleItem[]
    itemRefs: RefObject<Map<string, RefObject<HTMLDivElement>>>
    selected: Set<string>
    onClear?(): void
}

function ItemsDrawer({ items, itemRefs, selected, onClear }: ItemsDrawerProps) {
    const selectedItems = useMemo(
        () => items.filter(({ id }) => selected.has(id)),
        [items, selected],
    )
    if (selected.size === 0) return
    return (
        <Drawer
            variant="persistent"
            open={items.length > 0}
            sx={{ "& .MuiDrawer-paper": { maxWidth: "245px" } }}
        >
            <List
                sx={{
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box sx={{ overflow: "auto", flexGrow: 1 }}>
                    {selectedItems.map((item) => (
                        <ListItem key={item.id} disablePadding>
                            <ListItemButton
                                onClick={() =>
                                    itemRefs.current
                                        ?.get(item.id)
                                        ?.current?.scrollIntoView({
                                            behavior: "smooth",
                                        })
                                }
                            >
                                <ListItemText>{item.id}</ListItemText>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </Box>
                <Box sx={{ flexGrow: 0 }}>
                    <Divider />
                    <PrincipleCounterStack items={selectedItems} />
                    {onClear && (
                        <>
                            <Divider />
                            <ListItem disablePadding>
                                <ListItemButton onClick={onClear}>
                                    <ListItemIcon>
                                        <Delete />
                                    </ListItemIcon>
                                    <ListItemText>Clear</ListItemText>
                                </ListItemButton>
                            </ListItem>
                        </>
                    )}
                </Box>
            </List>
        </Drawer>
    )
}
export default ItemsDrawer
