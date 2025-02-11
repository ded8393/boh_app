import AppBar from "@mui/material/AppBar"
import Avatar, { AvatarProps } from "@mui/material/Avatar"
import Container from "@mui/material/Container"
import Link from "@mui/material/Link"
import Stack from "@mui/material/Stack"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import { useTheme } from "@mui/material/styles"

const SixthHistoryAvatar = (props: Omit<AvatarProps, "src">) => (
    <Avatar
        src={new URL("/data/sixth-history-logo.png", import.meta.url).href}
        {...props}
    />
)

export default function Home() {
    const theme = useTheme()
    return (
        <Stack direction="column" sx={{ height: "100%" }}>
            <Container sx={{ flexGrow: 1 }}>
                <Typography variant="h1" sx={{ textAlign: "center" }}>
                    Book of Hours companion
                </Typography>
            </Container>
            <AppBar
                position="static"
                component="footer"
                color="secondary"
                enableColorOnDark
                sx={{ flexGrow: 0 }}
            >
                <Toolbar>
                    <SixthHistoryAvatar sx={{ mr: 3 }} />
                    <Typography component="p">
                        Book of Hours companion is unofficial content based on
                        BOOK OF HOURS by Weather Factory Ltd.
                        <br />
                        You can find out more and support BOOK OF HOURS at{" "}
                        <Link
                            href="https://www.weatherfactory.biz/book-of-hours"
                            color={theme.palette.secondary.contrastText}
                        >
                            www.weatherfactory.biz/book-of-hours
                        </Link>
                        .
                    </Typography>
                </Toolbar>
            </AppBar>
        </Stack>
    )
}
