import axios from "axios"
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react"
import { useQuery } from "urql"

import { graphql } from "./gql"
import {
    ItemRef,
    KnownRecipe,
    KnownSkill,
    RecipeFromQuery,
    UserData,
} from "./types"

const API_URL = "http://localhost:8000"

interface UserDataContextProps {
    knownItems: ItemRef[]
    knownSkills: KnownSkill[]
    knownRecipes: RecipeFromQuery[]
}

const UserDataContext = createContext<UserDataContextProps>({
    knownItems: [],
    knownSkills: [],
    knownRecipes: [],
})

export const recipeQueryDocument = graphql(`
    query Recipes {
        recipe {
            id
            principle
            principle_amount
            source_aspect {
                id
            }
            source_item {
                id
                name
            }
            product {
                id
                name
            }
            crafting_action
            skills {
                id
                name
            }
        }
    }
`)

interface updateKnownRecipesArgs {
    state: KnownRecipe[]
    recipes: RecipeFromQuery[]
}

export function updateKnownRecipes({
    state,
    recipes,
}: updateKnownRecipesArgs): RecipeFromQuery[] {
    return recipes
        .filter(({ id }) => state.some((recipe) => recipe.id === id))
        .map((recipe) => {
            const knownRecipe = state.find((r) => r.id === recipe.id)
            const knownSkillSet = new Set(
                knownRecipe?.skills?.map(({ id }) => id) ?? [],
            )
            return {
                ...recipe,
                skills:
                    knownRecipe?.skills?.filter(({ id }) =>
                        knownSkillSet.has(id),
                    ) ?? [],
            }
        })
        .toSorted((a, b) => a.id.localeCompare(b.id))
}

export const useUserDataContext = (): UserDataContextProps =>
    useContext(UserDataContext)

interface UserDataContextProviderProps {
    children: ReactNode
}
export const UserDataContextProvider = ({
    children,
}: UserDataContextProviderProps) => {
    const [knownItems, setItems] = useState<ItemRef[]>([])
    const [knownSkills, setSkills] = useState<KnownSkill[]>([])
    const [knownRecipes, setRecipes] = useState<RecipeFromQuery[]>([])

    const [{ data }] = useQuery({ query: recipeQueryDocument })

    const recipeData = useMemo(() => data?.recipe ?? [], [data])
    const setKnownRecipes = useCallback(
        ({ state, recipes }: updateKnownRecipesArgs) => {
            const knownRecipes = updateKnownRecipes({ state, recipes })
            setRecipes(knownRecipes)
        },
        [setRecipes],
    )

    useMemo(() => {
        axios
            .get<UserData>(`${API_URL}/user_data`)
            .then(({ data }) => {
                const { items, skills, recipes } = data
                setItems(items)
                setSkills(skills)
                setKnownRecipes({ state: recipes, recipes: recipeData })
            })
            .catch((error) => {
                console.log(error)
            })
    }, [setItems, setSkills, setKnownRecipes, recipeData])
    return (
        <UserDataContext.Provider
            value={{ knownItems, knownSkills, knownRecipes }}
        >
            {children}
        </UserDataContext.Provider>
    )
}
