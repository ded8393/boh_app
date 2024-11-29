import axios from "axios"
import { useCallback, useMemo, useState } from "react"
import { useQuery } from "urql"
import { AsyncActionHandlers, useReducerAsync } from "use-reducer-async"

import Autocomplete from "@mui/material/Autocomplete"
import Button from "@mui/material/Button"
import CardActions from "@mui/material/CardActions"
import CardHeader from "@mui/material/CardHeader"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import Divider from "@mui/material/Divider"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"

import UpgradeIcon from "@mui/icons-material/Upgrade"

import PrincipleFilterBar from "../components/PrincipleFilterBar"
import { getPrinciples } from "../filters"
import { graphql } from "../gql"
import { Principle, SkillsQuery } from "../gql/graphql"
import { PrincipleCardHeader } from "../routes/Principles"
import { KnownSkill } from "../types"
import { useUserDataContext } from "../userContext"

const API_URL = "http://localhost:8000"

export const skillQueryDocument = graphql(`
    query Skills {
        skill {
            id
            name
            level
            primary_principle
            secondary_principle
        }
    }
`)

function updateSkills(
    state: SkillFromQuery[],
    skills: KnownSkill[],
): SkillFromQuery[] {
    return state
        .map((skill) => {
            const knownSkill = skills.find((s) => s.id === skill.id)
            if (!knownSkill) return skill
            return {
                ...skill,
                level: knownSkill.level,
            }
        })
        .toSorted((a, b) => a.id.localeCompare(b.id))
}

type SkillFromQuery = SkillsQuery["skill"][number]

/** Actions that can be handled synchronously in the reducer */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type SkillAction = SkillActionInner | SkillActionOuter
/** Synchronously handleable actions that are dispatched by the async action handler */
type SkillActionInner =
    | { type: "update"; skill: SkillFromQuery }
    | { type: "sort"; principle: Principle | undefined }
    | { type: "setKnown"; skills: KnownSkill[] }
/** Synchronously handleable actions that we dispatch manually */
type SkillActionOuter = never

function skillReducer(
    state: SkillFromQuery[],
    action: SkillAction,
): SkillFromQuery[] {
    switch (action.type) {
        case "update": {
            return state.map((skill) => {
                if (skill.id !== action.skill.id) return skill
                return action.skill
            })
        }
        case "sort": {
            if (!action.principle)
                return state.toSorted((a, b) => a.id.localeCompare(b.id))
            return state.toSorted((a, b) => b.level - a.level)
        }
        case "setKnown": {
            return updateSkills(state, action.skills)
        }
    }
}

/** Actions that are handled asynchronously by the action handler */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SkillActionAsync = { type: "increment"; skill: SkillFromQuery }

const skillHandlers: AsyncActionHandlers<
    typeof skillReducer,
    SkillActionAsync
> = {
    increment:
        ({ dispatch }) =>
        async ({ skill }) => {
            const { data: updatedSkill } = await axios.patch<SkillFromQuery>(
                `${API_URL}/skill/${skill.id}`,
                {
                    level: skill.level + 1,
                },
            )
            dispatch({ type: "update", skill: updatedSkill })
        },
}

interface SkillProps extends SkillFromQuery {
    onIncrement?(skill: SkillFromQuery): void
}

function Skill({ onIncrement, ...skill }: SkillProps) {
    const handleIncrement = useCallback(() => {
        onIncrement?.(skill)
    }, [skill, onIncrement])
    return (
        <div>
            <CardHeader title={skill.name} sx={{ p: 1 }} />
            <CardActions sx={{ gap: 2 }}>
                <PrincipleCardHeader
                    id={skill.primary_principle}
                    title={skill.level + 1}
                    sx={{ boxShadow: "none" }}
                    disablePadding
                />
                <Divider orientation="vertical" variant="middle" flexItem />
                <PrincipleCardHeader
                    id={skill.secondary_principle}
                    title={skill.level}
                    sx={{ boxShadow: "none" }}
                    disablePadding
                />
                {onIncrement && (
                    <Button
                        endIcon={
                            <UpgradeIcon
                                stroke="currentColor"
                                strokeWidth={0.5}
                            />
                        }
                        onClick={handleIncrement}
                        sx={{ ml: "auto" }}
                    >
                        Upgrade Skill
                    </Button>
                )}
            </CardActions>
        </div>
    )
}

interface NewSkillDialogProps {
    state: SkillFromQuery[]
    dispatch: React.Dispatch<SkillActionAsync>
}

const NewSkillDialog = ({ state, dispatch }: NewSkillDialogProps) => {
    const [open, setOpen] = useState(false)
    const [newSkill, setNewSkill] = useState<SkillFromQuery | undefined>()

    const handleClickOpen = useCallback(() => setOpen(true), [setOpen])
    const handleClose = useCallback(() => {
        // eslint-disable-next-line unicorn/no-useless-undefined
        setNewSkill(undefined) // de-select newSkill to reset Dialog to initial state
        setOpen(false)
    }, [setOpen, setNewSkill])

    const handleNewSkill = useCallback(
        (
            _event: React.SyntheticEvent,
            skill?: SkillFromQuery | undefined | null,
        ) => {
            setNewSkill(skill ?? undefined)
        },
        [setNewSkill],
    )
    const learnSkill = useCallback(() => {
        if (!newSkill) throw new Error("No skill selected")
        dispatch({ type: "increment", skill: newSkill })
        handleClose() // closes the dialog and resets newSkill to avoid warning
    }, [dispatch, newSkill, handleClose])

    return (
        <>
            <Button onClick={handleClickOpen} variant="contained">
                Learn new Skill
            </Button>
            <Dialog open={open} onClose={handleClose}>
                <DialogContent>
                    <Autocomplete
                        options={state.filter(({ level }) => level == 0)}
                        value={newSkill}
                        sx={{ width: 300 }}
                        getOptionLabel={(skill) => skill.id}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={(params) => (
                            <TextField {...params} label="Skill" />
                        )}
                        onChange={handleNewSkill}
                    />
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button onClick={learnSkill} disabled={!newSkill}>
                            Learn
                        </Button>
                    </DialogActions>
                </DialogContent>
            </Dialog>
        </>
    )
}

interface SkillStackProps {
    skills?: SkillFromQuery[]
    skillIdSet?: Set<string> | undefined
    selectedPrinciples?: Principle[] | undefined
    onSkillIncrement?(skill: SkillFromQuery): void
}
export const SkillsStack = ({
    skills,
    skillIdSet = new Set(),
    selectedPrinciples = [],
    onSkillIncrement,
}: SkillStackProps) => {
    const [{ data }] = useQuery({ query: skillQueryDocument })
    const { knownSkills } = useUserDataContext()

    const allSkills = useMemo(
        () => skills ?? updateSkills(data!.skill, knownSkills),
        [data, skills, knownSkills],
    )
    const selectedPrincipleSet = useMemo(
        () => new Set(selectedPrinciples ?? []),
        [selectedPrinciples],
    )

    const filteredSkills = useMemo(
        () =>
            allSkills
                .filter(({ id }) => skillIdSet.has(id) || skillIdSet.size === 0)
                .toSorted((a, b) => b.level - a.level)
                .filter(
                    (skill) =>
                        skill.level > 0 &&
                        (selectedPrinciples.length === 0 ||
                            getPrinciples(skill).some((principle) =>
                                selectedPrincipleSet.has(principle),
                            )),
                ),
        [allSkills, skillIdSet, selectedPrinciples, selectedPrincipleSet],
    )
    return (
        <Stack spacing={2} sx={{ p: 2 }}>
            {filteredSkills.map((skill) => (
                <Skill
                    key={skill.id}
                    onIncrement={onSkillIncrement}
                    {...skill}
                />
            ))}
        </Stack>
    )
}

const SkillsView = () => {
    const [{ data }] = useQuery({ query: skillQueryDocument })

    const [state, dispatch] = useReducerAsync(
        skillReducer,
        data!.skill,
        skillHandlers,
    )
    const { knownSkills } = useUserDataContext()
    useMemo(
        () => dispatch({ type: "setKnown", skills: knownSkills }),
        [dispatch, knownSkills],
    )
    const [selectedPrinciple, setPrinciple] = useState<Principle | undefined>()

    const handleSelectedPrinciple = useCallback(
        (principle: Principle | undefined) => {
            dispatch({ type: "sort", principle })
            setPrinciple(principle)
        },
        [setPrinciple, dispatch],
    )

    const handleSkillIncrement = useCallback(
        (skill: SkillFromQuery) => dispatch({ type: "increment", skill }),
        [dispatch],
    )

    return (
        <Stack
            spacing={2}
            sx={{
                maxWidth: "450px",
                marginBlock: 1,
                marginInline: "auto",
            }}
        >
            <PrincipleFilterBar
                selectedPrinciple={selectedPrinciple}
                onSelectPrinciple={handleSelectedPrinciple}
            />
            <NewSkillDialog state={state} dispatch={dispatch} />
            <SkillsStack
                skills={state}
                selectedPrinciples={
                    selectedPrinciple ? [selectedPrinciple] : undefined
                }
                onSkillIncrement={handleSkillIncrement}
            />
        </Stack>
    )
}

export default SkillsView
