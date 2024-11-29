import { useQuery } from "urql"

import Box from "@mui/material/Box"
import CardContent from "@mui/material/CardContent"
import CardHeader from "@mui/material/CardHeader"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemText from "@mui/material/ListItemText"

import AvatarStack from "../components/AvatarStack"
import { AspectIcon } from "../components/Icon"
import { graphql } from "../gql"
import { AspectsQuery } from "../gql/graphql"

const aspectQueryDocument = graphql(`
    query Aspects {
        aspect {
            id
            assistants {
                id
            }
        }
    }
`)

type AspectFromQuery = AspectsQuery["aspect"][number]
interface BasicAspect extends Omit<AspectFromQuery, "assistants"> {
    assistants?: AspectFromQuery["assistants"]
}

interface AspectIconGroupProps {
    aspects: BasicAspect[]
}

const AspectIconGroup = ({ aspects }: AspectIconGroupProps) => (
    <AvatarStack>
        {aspects.map(({ id }) => (
            <AspectIcon key={id} aspect={id} />
        ))}
    </AvatarStack>
)

interface AspectProps extends BasicAspect {
    nameAspect?: boolean
    showAssistant?: boolean
}

function Aspect({
    nameAspect = true,
    showAssistant = false,
    id,
    assistants = [],
}: AspectProps) {
    return (
        <div>
            <CardHeader
                title={nameAspect ? id : ""}
                avatar={<AspectIcon aspect={id} />}
                titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent style={{ padding: 0 }}>
                {showAssistant && assistants.length > 0 && (
                    <List disablePadding>
                        {assistants.map(({ id }) => (
                            <ListItem key={id} sx={{ pl: 4 }}>
                                <ListItemText primary={id} />
                            </ListItem>
                        ))}
                    </List>
                )}
            </CardContent>
        </div>
    )
}

const AspectsView = () => {
    const [{ data }] = useQuery({ query: aspectQueryDocument })
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
            {data!.aspect.map(({ assistants, id }) => (
                <Aspect
                    key={id}
                    showAssistant={true}
                    id={id}
                    assistants={assistants}
                />
            ))}
        </Box>
    )
}

export { Aspect, AspectIconGroup, AspectsView as default }
