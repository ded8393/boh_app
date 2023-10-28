import { useQuery } from "urql"

import Avatar, { AvatarProps } from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Card, { CardProps } from "@mui/material/Card"
import CardHeader from "@mui/material/CardHeader"

import AvatarStack from "../components/AvatarStack"
import { graphql } from "../gql"
import * as types from "../gql/graphql"

const principleQueryDocument = graphql(`
    query Principle {
        principle {
            id
        }
    }
`)

type PrincipleFromQuery = types.PrincipleQuery["principle"][number]

interface PrincipleIconProps extends Omit<AvatarProps, "src"> {
    id: string
}

const PrincipleIcon = ({
    id,
    alt,
    variant = "square",
    ...props
}: PrincipleIconProps) => (
    <Avatar
        alt={alt ?? id}
        variant={variant}
        src={`/data/principle/${id}.png`}
        {...props}
    />
)

function PrincipleIconGroup({
    principles,
}: {
    principles: PrincipleFromQuery[]
}) {
    return (
        <AvatarStack>
            {principles.map(({ id }) => (
                <PrincipleIcon key={id} id={id} />
            ))}
        </AvatarStack>
    )
}

interface PrincipleCardProps extends Omit<CardProps, "title"> {
    id: string
    title?: object | string | number
    disablePadding?: boolean
}

function PrincipleCard({
    id,
    title = id,
    disablePadding = false,
    ...cardProps
}: PrincipleCardProps) {
    return (
        <Card {...cardProps}>
            <CardHeader
                title={title.toString()}
                titleTypographyProps={{ variant: "h6" }}
                avatar={<PrincipleIcon id={id} />}
                sx={{ padding: disablePadding ? 0 : 2 }}
            />
        </Card>
    )
}

const Principles = () => {
    const [{ data }] = useQuery({ query: principleQueryDocument })
    return (
        <Box
            sx={{
                maxWidth: "350px",
                marginBlock: 1,
                marginInline: "auto",
                display: "flex",
                flexDirection: "column",
                rowGap: 1,
            }}
        >
            {data!.principle.map(({ id }) => (
                <PrincipleCard key={id} id={id} />
            ))}
        </Box>
    )
}

export {
    PrincipleIcon,
    PrincipleIconGroup,
    PrincipleCard,
    Principles as default,
}
