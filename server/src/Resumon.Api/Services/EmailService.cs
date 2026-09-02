using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Resumon.Api.Options;

namespace Resumon.Api.Services;

/// <summary>Sends transactional emails (OTP codes, password resets).</summary>
public interface IEmailService
{
    /// <summary>
    /// Delivers an OTP code email. <paramref name="purpose"/> controls the subject line and copy
    /// (e.g. "signup" → "Verify your email", "password-reset" → "Reset your password").
    /// </summary>
    Task SendOtpAsync(string toEmail, string otp, string purpose, CancellationToken cancellationToken = default);
}

public sealed class EmailService(
    IOptions<SmtpOptions> options,
    ILogger<EmailService> logger) : IEmailService
{
    private readonly SmtpOptions _smtp = options.Value;

    public async Task SendOtpAsync(string toEmail, string otp, string purpose, CancellationToken cancellationToken)
    {
        if (!_smtp.IsConfigured)
        {
            // Dev mode: silently skip sending.
            return;
        }

        var (subject, heading, description) = purpose switch
        {
            "password-reset" => (
                "Reset your Resumon password",
                "Password Reset Code",
                "You requested a password reset for your Resumon account. Enter this code to set a new password:"),
            _ => (
                "Verify your email — Resumon",
                "Email Verification Code",
                "You're almost there! Enter this code to verify your email and complete your Resumon registration:"),
        };

        var html = BuildEmailHtml(heading, description, otp);

        using var message = new MailMessage
        {
            From = new MailAddress(_smtp.SenderEmail, _smtp.SenderName),
            Subject = subject,
            Body = html,
            IsBodyHtml = true,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(_smtp.Host, _smtp.Port)
        {
            Credentials = new NetworkCredential(_smtp.Username, _smtp.Password),
            EnableSsl = _smtp.EnableSsl,
        };

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("OTP email sent to {Email} for {Purpose}.", toEmail, purpose);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send OTP email to {Email}.", toEmail);
            throw;
        }
    }

    private static string BuildEmailHtml(string heading, string description, string otp)
    {
        return $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#0f0f23;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:480px;margin:40px auto;padding:40px 32px;background:#1a1a2e;border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
            <div style="text-align:center;margin-bottom:32px;">
              <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#22c55e,#34d399);border-radius:12px;line-height:48px;font-size:24px;font-weight:700;color:#0f0f23;">R</div>
            </div>
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e2e8f0;text-align:center;">{heading}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:rgba(226,232,240,0.6);text-align:center;line-height:1.6;">{description}</p>
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#22c55e;font-family:'Courier New',monospace;">{otp}</span>
            </div>
            <p style="margin:0 0 8px;font-size:12px;color:rgba(226,232,240,0.4);text-align:center;">This code expires in <strong style="color:rgba(226,232,240,0.7);">10 minutes</strong>.</p>
            <p style="margin:0;font-size:12px;color:rgba(226,232,240,0.4);text-align:center;">If you didn't request this, you can safely ignore this email.</p>
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:32px 0 16px;">
            <p style="margin:0;font-size:11px;color:rgba(226,232,240,0.3);text-align:center;">Resumon — AI-Powered Resume Analysis</p>
          </div>
        </body>
        </html>
        """;
    }
}
