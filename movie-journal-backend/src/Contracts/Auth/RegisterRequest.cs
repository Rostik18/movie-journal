namespace MovieJournalBackend.Contracts.Auth
{
    public class RegisterRequest
    {
        public required string Login { get; init; }
        public required string Password { get; init; }
        public string? DisplayName { get; init; }
    }
}
