import { Suspense, useMemo } from "react"
import {
    Link,
    Navigate,
    PathMatch,
    Route,
    matchPath,
    useLocation,
} from "react-router-dom"
import SlideRoutes from "react-slide-routes"

import CssBaseline from "@mui/material/CssBaseline"
import MuiDrawer from "@mui/material/Drawer"
import Stack from "@mui/material/Stack"
import Tab from "@mui/material/Tab"
import Tabs from "@mui/material/Tabs"
import Toolbar from "@mui/material/Toolbar"
import { amber } from "@mui/material/colors"
import {
    ThemeProvider,
    alpha,
    createTheme,
    responsiveFontSizes,
    styled,
    useTheme,
} from "@mui/material/styles"
import useMediaQuery from "@mui/material/useMediaQuery"

import { useDrawerContext } from "./components/Drawer/index.tsx"
import { AppBar, Main } from "./components/Drawer/styled.tsx"
import ElevationScroll from "./components/ElevationScroll.tsx"
import LoadingIndicator from "./components/LoadingIndicator.tsx"
import AssistantView from "./routes/Assistant.tsx"
import CraftView from "./routes/Craft.tsx"
import Home from "./routes/Home"
import SkillsView from "./routes/Skills"
import WorkstationsView from "./routes/Workstation.tsx"

const ROUTE_LINKS = [
    { label: "Home", href: "/", pattern: "/" },
    { label: "Skills", href: "/skills", pattern: "/skills" },
    { label: "Craft", href: "/craft", pattern: "/craft" },
    { label: "Assistance", href: "/assistance", pattern: "/assistance" },
    { label: "Workstations", href: "/workstations", pattern: "/workstations" },
]

function useRouteMatch(
    patterns: readonly string[],
): PathMatch<string> | undefined {
    const { pathname } = useLocation()

    for (const pattern of patterns) {
        const possibleMatch = matchPath(pattern, pathname)
        if (possibleMatch !== null) {
            return possibleMatch
        }
    }

    return undefined
}

function makeBaseTheme(dark: boolean) {
    const buttonStyle = { fontWeight: "bold" }
    return createTheme({
        palette: {
            mode: dark ? "dark" : "light",
            primary: amber,
        },
        typography: {
            button: buttonStyle,
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    text: buttonStyle,
                    textPrimary: buttonStyle,
                },
            },
            MuiButtonBase: {
                styleOverrides: {
                    root: buttonStyle,
                },
            },
            MuiStack: {
                defaultProps: {
                    useFlexGap: true,
                },
            },
        },
    })
}

function AppNav() {
    const theme = useTheme()
    const { open, width } = useDrawerContext()
    const currentTab = useRouteMatch(ROUTE_LINKS.map(({ pattern }) => pattern))
        ?.pattern.path
    return (
        <ElevationScroll>
            <AppBar
                open={open}
                drawerWidth={width}
                position="fixed"
                sx={{
                    color: theme.palette.text.primary,
                    background: alpha(theme.palette.background.default, 0.7),
                    // TODO re-add contrast(200%) before blur without discoloring dark mode
                    backdropFilter: "blur(15px)",
                }}
            >
                <Toolbar component="nav" sx={{ justifyContent: "center" }}>
                    <Tabs centered value={currentTab}>
                        {ROUTE_LINKS.map(({ label, href, pattern }) => (
                            <Tab
                                key={label}
                                label={label}
                                value={pattern}
                                component={Link}
                                to={href}
                            />
                        ))}
                    </Tabs>
                </Toolbar>
            </AppBar>
        </ElevationScroll>
    )
}

function Drawer() {
    const { open, width, ref } = useDrawerContext()
    return (
        <MuiDrawer
            variant="persistent"
            open={open}
            anchor="left"
            sx={{
                width: `${width}px`,
                flexShrink: 0,
            }}
            PaperProps={{
                ref,
                sx: {
                    width: `${width}px`,
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                },
            }}
        />
    )
}

const Offset = styled("div")(({ theme }) => theme.mixins.toolbar)

function Content() {
    const theme = useTheme()
    const { open, width } = useDrawerContext()
    return (
        <Main
            open={open}
            drawerWidth={width}
            component="main"
            sx={{
                flexGrow: 1,
                paddingBlockEnd: theme.spacing(3),
                display: "flex",
                flexDirection: "column",
                "& > *": { flexGrow: 0 },
                "& > .slide-routes": { flexGrow: 1 },
            }}
        >
            <Offset />
            <Suspense fallback={<LoadingIndicator sx={{ m: "auto" }} />}>
                <SlideRoutes>
                    <Route index element={<Home />} />
                    <Route path="skills" element={<SkillsView />} />
                    <Route path="craft" element={<CraftView />} />
                    <Route path="assistance" element={<AssistantView />} />
                    <Route path="workstations" element={<WorkstationsView />} />
                    <Route path="*" element={<Navigate replace to="/" />} />
                </SlideRoutes>
            </Suspense>
        </Main>
    )
}

export default function App() {
    const dark = useMediaQuery("(prefers-color-scheme: dark)")
    const theme = useMemo(
        () => responsiveFontSizes(makeBaseTheme(dark)),
        [dark],
    )
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppNav />
            <Stack direction="row" sx={{ flexGrow: 1, display: "flex" }}>
                <Drawer />
                <Content />
            </Stack>
        </ThemeProvider>
    )
}
