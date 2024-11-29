import {
    ReactNode,
    SyntheticEvent,
    useCallback,
    useMemo,
    useState,
} from "react"
import { useQuery } from "urql"

import Autocomplete from "@mui/material/Autocomplete"
import Card from "@mui/material/Card"
import CardHeader from "@mui/material/CardHeader"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Grid from "@mui/material/Unstable_Grid2"

import { Collapsible } from "../components/Collapsible"
import { ItemsDrawerContextProvider } from "../components/ItemsDrawer/context"
import { graphql } from "../gql"
import { ProductsQuery } from "../gql/graphql"
import { KnownRecipe } from "../types"
import { useUserDataContext } from "../userContext"
import { Aspect } from "./Aspects"
import { ItemsView, SingleItemView } from "./Items"
import { PrincipleCardHeader } from "./Principles"
import { SkillsStack } from "./Skills"
import WorkstationsView from "./Workstation"

export const productsQueryDocument = graphql(`
    query Products {
        item {
            id
            name
            aspects {
                id
            }
            source_recipe {
                id
                source_item {
                    id
                }
                principle
                principle_amount
                source_aspect {
                    id
                }
            }
        }
    }
`)

type ProductItem = ProductsQuery["item"][number]

interface RecipeProps {
    recipe: KnownRecipe
}

const RecipeAspect = ({ recipe }: RecipeProps) => (
    <Collapsible
        cardHeader={<Aspect id={recipe.source_aspect.id} />}
        buttonShowHideText="Possible Items"
    >
        <ItemsView
            filters={{
                // principles: [recipe.principle], // TODO: add sort by principle, filter removes valid items
                aspects: [recipe.source_aspect],
            }}
        />
    </Collapsible>
)

const RecipeSource = ({ recipe }: RecipeProps) => (
    <>
        {recipe.source_aspect && <RecipeAspect recipe={recipe} />}
        {recipe.source_item && (
            <SingleItemView itemId={recipe.source_item.id} />
        )}
    </>
)

interface DetailsRowProps {
    label: string
    children: ReactNode
}

const DetailsRow = ({ label, children }: DetailsRowProps) => (
    <>
        <Grid>
            <Typography variant="h5">{label}</Typography>
        </Grid>
        <Grid>{children}</Grid>
    </>
)

const RecipeDetails = (recipe: KnownRecipe) => {
    const skillIdSet = useMemo(
        () => new Set(recipe.skills.map(({ id }) => id)),
        [recipe],
    )
    const hasSource =
        Boolean(recipe.source_item) || Boolean(recipe.source_aspect)
    return (
        <Card>
            <Grid
                container
                padding={2}
                spacing={4}
                sx={{ display: "grid", gridTemplateColumns: "min-content 1fr" }}
            >
                <DetailsRow label="Principle">
                    <PrincipleCardHeader
                        id={recipe.principle}
                        title={recipe.principle_amount}
                    />
                </DetailsRow>
                {hasSource && (
                    <DetailsRow label="Source">
                        <RecipeSource recipe={recipe} />
                    </DetailsRow>
                )}
                {skillIdSet.size > 0 && (
                    <DetailsRow label="Skills">
                        <SkillsStack
                            skillIdSet={skillIdSet}
                            selectedPrinciples={[recipe.principle]}
                        />
                    </DetailsRow>
                )}
            </Grid>
        </Card>
    )
}

const RecipeView = ({ recipe }: { recipe: KnownRecipe }) => {
    return (
        <Stack spacing={2}>
            <RecipeDetails {...recipe} />
            <Collapsible
                cardHeader={
                    <CardHeader
                        title="Workstations"
                        titleTypographyProps={{ variant: "h5" }}
                    />
                }
            >
                <WorkstationsView
                    filterPrinciple={recipe.principle}
                    includeItems={false}
                />
            </Collapsible>
        </Stack>
    )
}

const RecipesView = (recipeProduct: ProductItem) => {
    const { knownRecipes } = useUserDataContext()
    const productRecipes = knownRecipes.filter(
        ({ product }) => product.id === recipeProduct.id,
    )
    return (
        <Stack spacing={2}>
            {productRecipes.map((recipe) => (
                <RecipeView key={recipe.id} recipe={recipe} />
            ))}
        </Stack>
    )
}

const CraftView = () => {
    const [{ data }] = useQuery({ query: productsQueryDocument })
    const [product, setProduct] = useState<ProductItem | undefined>()
    const { knownRecipes } = useUserDataContext()

    const knownRecipeSet = useMemo(
        () => new Set(knownRecipes.map(({ id }) => id)),
        [knownRecipes],
    )

    const userKnownRecipes: ProductItem[] = useMemo(
        () =>
            data!.item
                .filter(({ source_recipe }) => source_recipe.length > 0)
                .filter(({ source_recipe }) =>
                    source_recipe.some(({ id }) => knownRecipeSet.has(id)),
                ),
        [data, knownRecipeSet],
    )
    const handleProductSelect = useCallback(
        (_: SyntheticEvent, product?: ProductItem | null) => {
            setProduct(product ?? undefined)
        },
        [setProduct],
    )
    // maybe try a query for the item instead of context provider
    return (
        <ItemsDrawerContextProvider>
            <Stack
                maxWidth="md"
                justifyContent="center"
                marginInline="auto"
                marginBlock={2}
                spacing={4}
            >
                <Autocomplete
                    options={userKnownRecipes}
                    getOptionLabel={({ name }) => name}
                    isOptionEqualToValue={(a, b) => a.name === b.name}
                    renderInput={(params) => (
                        <TextField {...params} label="Select Item to Craft" />
                    )}
                    onChange={handleProductSelect}
                />
                {product && <RecipesView {...product} />}
            </Stack>
        </ItemsDrawerContextProvider>
    )
}

export default CraftView
