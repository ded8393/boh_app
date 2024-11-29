import { Fragment, useCallback, useMemo, useReducer, useState } from "react"
import { useQuery } from "urql"

import Card from "@mui/material/Card"
import CardHeader from "@mui/material/CardHeader"
import Divider from "@mui/material/Divider"
import Stack from "@mui/material/Stack"

import { Collapsible } from "../components/Collapsible"
import {
    ItemsDrawerContextProvider,
    itemsQueryDocument,
} from "../components/ItemsDrawer/context"
import PrincipleFilterBar from "../components/PrincipleFilterBar"
import { getPrinciples } from "../filters"
import { graphql } from "../gql"
import { Principle, WorkstationQuery } from "../gql/graphql"
import { AspectIconGroup } from "./Aspects"
import { ItemsView } from "./Items"
import { PrincipleIconGroup } from "./Principles"
import { SkillsStack, skillQueryDocument } from "./Skills"

const workstationQueryDocument = graphql(`
    query Workstation {
        workstation {
            id
            principles
            workstation_type {
                id
            }
            workstation_slots {
                id
                name
                index
                accepts {
                    id
                }
            }
            evolves {
                id
            }
        }
    }
`)

type WorkstationFromQuery = WorkstationQuery["workstation"][number]
type WorkstationSlotFromQuery =
    WorkstationFromQuery["workstation_slots"][number]

interface VisibleWorkstation extends WorkstationFromQuery {
    isVisible: boolean
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type WorkstationAction = {
    type: "filter"
    principle: Principle | undefined
}

function workstationReducer(
    state: VisibleWorkstation[],
    action: WorkstationAction,
): VisibleWorkstation[] {
    switch (action.type) {
        case "filter": {
            const workstationData: VisibleWorkstation[] = state.map(
                (workstation) => ({
                    ...workstation,
                    isVisible: true,
                }),
            )
            if (!action.principle) return workstationData
            return workstationData.map((workstation) => {
                const workstationPrinciples = new Set(
                    getPrinciples(workstation),
                )
                if (
                    action.principle &&
                    !workstationPrinciples.has(action.principle)
                ) {
                    return { ...workstation, isVisible: false }
                }
                return workstation
            })
        }
    }
}

interface WorkstationSlotProps {
    workstationSlot: WorkstationSlotFromQuery
    principles: Principle[]
    includeItems?: boolean
}

const WorkstationSlotInfo = ({ name, accepts }: WorkstationSlotFromQuery) => (
    <CardHeader
        title={name}
        titleTypographyProps={{ variant: "h6" }}
        avatar={accepts.length > 0 && <AspectIconGroup aspects={accepts} />}
        sx={{ p: 1 }}
    />
)

const FullWorkstationSlot = ({
    workstationSlot,
    principles,
}: WorkstationSlotProps) => (
    <Collapsible
        buttonShowHideText="Items"
        cardHeader={<WorkstationSlotInfo {...workstationSlot} />}
    >
        {workstationSlot.id === "Skill" ? (
            <SkillsStack selectedPrinciples={principles} />
        ) : (
            <ItemsView
                filters={{
                    aspects: workstationSlot.accepts,
                    principles,
                }}
                group={workstationSlot.id}
            />
        )}
    </Collapsible>
)

const WorkstationSlot = ({
    workstationSlot,
    principles,
    includeItems,
}: WorkstationSlotProps) =>
    includeItems ? (
        <FullWorkstationSlot
            workstationSlot={workstationSlot}
            principles={principles}
        />
    ) : (
        <WorkstationSlotInfo {...workstationSlot} />
    )

interface WorkstationProps {
    workstation: VisibleWorkstation | WorkstationFromQuery
    includeItems?: boolean
}

const Workstation = ({ workstation, includeItems }: WorkstationProps) => (
    <Card sx={{ boxShadow: "none" }}>
        <CardHeader
            title={workstation.id}
            titleTypographyProps={{ variant: "h5" }}
            avatar={
                <PrincipleIconGroup principles={getPrinciples(workstation)} />
            }
        />
        <Stack>
            {workstation.workstation_slots
                .toSorted((a, b) => a.index - b.index)
                .map((slot) => (
                    <Fragment key={slot.id}>
                        <Divider variant="middle" />
                        <WorkstationSlot
                            workstationSlot={slot}
                            principles={getPrinciples(workstation)}
                            includeItems={includeItems}
                        />
                    </Fragment>
                ))}
        </Stack>
    </Card>
)

interface FilteredWorkstationsViewProps {
    workstations: VisibleWorkstation[] | WorkstationFromQuery[]
    includeItems?: boolean
}
// Displays a filtered set of workstations
// includeItems default set here, and assumed to be set in children
const FilteredWorkstationsView = ({
    workstations,
    includeItems = true,
}: FilteredWorkstationsViewProps) => (
    <Stack spacing={2}>
        {workstations
            .toSorted((a, b) => a.id.localeCompare(b.id))
            .map((workstation) => (
                <Workstation
                    key={workstation.id}
                    workstation={workstation}
                    includeItems={includeItems}
                />
            ))}
    </Stack>
)

interface WorkstationsViewProps {
    filterPrinciple?: Principle | undefined
    includeItems?: boolean
}

export default function WorkstationsView({
    filterPrinciple,
    includeItems = true,
}: WorkstationsViewProps) {
    const [{ data }] = useQuery({ query: workstationQueryDocument })
    // prefetch
    useQuery({ query: skillQueryDocument })
    useQuery({ query: itemsQueryDocument })

    const initialState: VisibleWorkstation[] = useMemo(
        () =>
            data!.workstation.map((workstation) => ({
                ...workstation,
                isVisible:
                    filterPrinciple === undefined ||
                    workstation.principles.includes(filterPrinciple),
            })),
        [data, filterPrinciple],
    )
    const [state, dispatch] = useReducer(workstationReducer, initialState)

    const [selectedPrinciple, setPrinciple] = useState<Principle | undefined>(
        filterPrinciple,
    )
    const handleSelectedPrinciple = useCallback(
        (principle: Principle | undefined) => {
            dispatch({ type: "filter", principle })
            setPrinciple(principle)
        },
        [dispatch, setPrinciple],
    )

    const visibleWorkstations = state.filter(({ isVisible }) => isVisible)

    return (
        <Stack maxWidth="md" marginInline="auto" spacing={2}>
            <Collapsible
                cardHeader={
                    <CardHeader
                        title="Filters"
                        titleTypographyProps={{ variant: "h5" }}
                    />
                }
            >
                <PrincipleFilterBar
                    selectedPrinciple={selectedPrinciple}
                    onSelectPrinciple={handleSelectedPrinciple}
                />
            </Collapsible>
            <ItemsDrawerContextProvider>
                <FilteredWorkstationsView
                    workstations={visibleWorkstations}
                    includeItems={includeItems}
                />
            </ItemsDrawerContextProvider>
        </Stack>
    )
}
