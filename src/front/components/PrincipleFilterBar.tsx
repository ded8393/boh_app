import IconButton from "@mui/material/IconButton"
import Stack from "@mui/material/Stack"

import ClearIcon from "@mui/icons-material/Clear"

import { Principle } from "../gql/graphql"
import PrincipleFilterButton from "./PrincipleFilterButton"

interface PrincipleFilterProps {
    selectedPrinciple: Principle | undefined
    onSelectPrinciple(principle?: Principle | undefined): void
}

const PrincipleFilterBar = ({
    selectedPrinciple,
    onSelectPrinciple,
}: PrincipleFilterProps) => (
    <Stack direction="row" spacing={2} flexWrap="wrap">
        {Object.values(Principle).map((principle) => (
            <PrincipleFilterButton
                key={principle}
                principle={principle}
                selectedPrinciple={selectedPrinciple}
                onPrincipleFilter={onSelectPrinciple}
            />
        ))}
        <IconButton size="large" onClick={() => onSelectPrinciple()}>
            <ClearIcon />
        </IconButton>
    </Stack>
)
export default PrincipleFilterBar
