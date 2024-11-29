import Box from "@mui/material/Box"
import { CardProps } from "@mui/material/Card"
import CardHeader from "@mui/material/CardHeader"

import AvatarStack from "../components/AvatarStack"
import { PrincipleIcon } from "../components/Icon"
import { Principle } from "../gql/graphql"

interface PrincipleIconGroupProps {
    principles: Principle[]
}

function PrincipleIconGroup({ principles }: PrincipleIconGroupProps) {
    return (
        <AvatarStack>
            {principles.map((principle) => (
                <PrincipleIcon key={principle} principle={principle} />
            ))}
        </AvatarStack>
    )
}

interface PrincipleCardProps extends Omit<CardProps, "title"> {
    id: Principle
    title?: object | string | number
    disablePadding?: boolean
}

function PrincipleCardHeader({
    id,
    title = id,
    disablePadding = false,
}: PrincipleCardProps) {
    return (
        <CardHeader
            title={String(title)}
            titleTypographyProps={{ variant: "h6" }}
            avatar={<PrincipleIcon principle={id} />}
            sx={{ padding: disablePadding ? 0 : 2 }}
        />
    )
}

const Principles = () => (
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
        {Object.values(Principle).map((principle) => (
            <PrincipleCardHeader key={principle} id={principle} />
        ))}
    </Box>
)

export { PrincipleIconGroup, PrincipleCardHeader, Principles as default }
