using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace MovieJournalBackend
{
    public sealed class ExceptionMiddleware(
        ILogger<ExceptionMiddleware> _logger,
        RequestDelegate _next)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                if (_logger.IsEnabled(LogLevel.Information))
                {
                    _logger.LogInformation("Processing request {Method} {Path}", context.Request.Method, context.Request.Path);
                }

                await _next(context);

                if (_logger.IsEnabled(LogLevel.Information))
                {
                    _logger.LogInformation("Request {Method} {Path} completed", context.Request.Method, context.Request.Path);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Got exception while processing {Method} {Path}", context.Request.Method, context.Request.Path);

                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var (statusCode, title) = exception switch
            {
                ValidationException => (StatusCodes.Status400BadRequest, "Validation error"),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
                ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
                NotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
                _ => (StatusCodes.Status500InternalServerError, "Internal server error")
            };

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/problem+json";

            var response = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = exception.Message
            };

            await context.Response.WriteAsJsonAsync(response);
        }
    }

    public class ForbiddenException(string? message) : Exception(message) { }
    public class NotFoundException(string? message) : Exception(message) { }
}
