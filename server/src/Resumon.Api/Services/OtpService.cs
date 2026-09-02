using System.Security.Cryptography;
using System.Text;
using MongoDB.Driver;
using Resumon.Api.Data;
using Resumon.Api.Domain;

namespace Resumon.Api.Services;

/// <summary>Generates, stores and validates one-time passwords for email verification.</summary>
public interface IOtpService
{
    /// <summary>
    /// Generates a new 6-digit OTP, stores its hash, and returns the plain code to be emailed.
    /// Rate limits to 3 active unconsumed OTPs per email/purpose pair.
    /// </summary>
    Task<string> GenerateAndStoreAsync(string email, string purpose, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates an OTP. A successful validation marks it as consumed so it cannot be reused.
    /// </summary>
    Task<bool> ValidateAsync(string email, string otp, string purpose, CancellationToken cancellationToken = default);
}

public sealed class OtpService(MongoContext context, TimeProvider timeProvider) : IOtpService
{
    public async Task<string> GenerateAndStoreAsync(string email, string purpose, CancellationToken cancellationToken)
    {
        var normalizedEmail = email.ToUpperInvariant();
        var now = timeProvider.GetUtcNow().UtcDateTime;

        // Rate limit: prevent spamming by allowing max 3 active OTPs.
        var activeCount = await context.OtpTokens
            .CountDocumentsAsync(
                t => t.Email == normalizedEmail && t.Purpose == purpose && !t.Consumed && t.ExpiresAt > now,
                cancellationToken: cancellationToken);

        if (activeCount >= 3)
        {
            throw new InvalidOperationException("Too many active verification codes. Please wait before requesting another.");
        }

        // 6 digits, zero-padded.
        var code = RandomNumberGenerator.GetInt32(0, 1000000).ToString("D6");
        var hash = Hash(code);

        await context.OtpTokens.InsertOneAsync(
            new OtpDocument
            {
                Email = normalizedEmail,
                Purpose = purpose,
                OtpHash = hash,
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(10),
                Consumed = false,
            },
            cancellationToken: cancellationToken);

        return code;
    }

    public async Task<bool> ValidateAsync(string email, string otp, string purpose, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(otp) || string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var normalizedEmail = email.ToUpperInvariant();
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var hash = Hash(otp);

        // Find and consume in one atomic operation.
        var document = await context.OtpTokens.FindOneAndUpdateAsync(
            Builders<OtpDocument>.Filter.And(
                Builders<OtpDocument>.Filter.Eq(t => t.Email, normalizedEmail),
                Builders<OtpDocument>.Filter.Eq(t => t.Purpose, purpose),
                Builders<OtpDocument>.Filter.Eq(t => t.OtpHash, hash),
                Builders<OtpDocument>.Filter.Eq(t => t.Consumed, false),
                Builders<OtpDocument>.Filter.Gt(t => t.ExpiresAt, now)),
            Builders<OtpDocument>.Update.Set(t => t.Consumed, true),
            cancellationToken: cancellationToken);

        return document is null ? false : true;
    }

    private static string Hash(string value)
        => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
