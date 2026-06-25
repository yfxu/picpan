import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/((?!api/auth|api/setup|api/albums/[^/]+/access|api/media/|login|setup|p/|_next/static|_next/image|favicon\\.ico).*)",
  ],
}
