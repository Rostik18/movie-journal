namespace MovieJournalBackend.Contracts.User
{
    public class ChangePasswordRequest
    {
        public required string UserId { get; set; }
        public required string NewPassword { get; set; }
    }
}
