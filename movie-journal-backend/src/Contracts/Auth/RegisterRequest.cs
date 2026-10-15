namespace MovieJournalBackend.Contracts.Auth
{
    //todo: is not public contract, its just internal dto for the moment
    public class RegisterRequest
    {
        public required string Login { get; init; }
        public required string Password { get; init; }
        public string? DisplayName { get; init; }
    }
}
