using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MovieJournalBackend.Entities.User;
using MovieJournalBackend.Settings;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MovieJournalBackend.Services.Auth
{
    public sealed class JwtService(IOptions<JwtSettings> settings) : IJwtService
    {
        private readonly JwtSettings _settings = settings.Value;

        public string GenerateToken(User user)
        {
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id!),
                new(JwtRegisteredClaimNames.UniqueName, user.Login)
            };

            foreach (var role in user.Roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role.ToString()));
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));

            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddDays(_settings.ExpirationDays);

            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Audience,
                claims: claims,
                expires: expires,
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        //public DateTime GetExpirationUtc()
        //{
        //    return DateTime.UtcNow.AddDays(
        //        _settings.ExpirationDays);
        //}
    }
}



