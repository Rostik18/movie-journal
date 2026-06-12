namespace MovieJournalBackend.Settings
{
    public sealed class JwtSettings
    {
        public string Issuer { get; init; } = null!;
        public string Audience { get; init; } = null!;
        public string SecretKey { get; init; } = null!;
        public int ExpirationDays { get; init; }
    }
}
