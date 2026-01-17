package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// Middleware ensures the request has a valid JWT token.
func Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing authorization header"})
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid header format"})
			}

			token := parts[1]
			claims, err := ValidateToken(token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid token"})
			}

			// Store claims in context
			c.Set("uid", claims.UserID)
			c.Set("role", claims.Role)

			return next(c)
		}
	}
}
