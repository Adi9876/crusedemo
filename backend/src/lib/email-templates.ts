/**
 * Email templates for CruseX notifications
 */

export function getVerificationEmailTemplate(verifyUrl: string, firstName: string): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2b6cb0; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Cruse<span style="color: #3182ce;">X</span></h1>
        <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px;">Premium Crypto Asset Exchange</p>
      </div>
      
      <div style="border-top: 3px solid #3182ce; padding-top: 20px;">
        <h2 style="color: #2d3748; margin-top: 0; font-size: 20px;">Welcome to CruseX, ${firstName}!</h2>
        <p style="line-height: 1.6; font-size: 16px;">We are excited to have you on board. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${verifyUrl}" style="background-color: #3182ce; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.15);">Verify My Email</a>
        </div>
        
        <p style="line-height: 1.6; font-size: 14px; color: #4a5568;">If you did not sign up for a CruseX account, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
        <p style="line-height: 1.5; font-size: 12px; color: #718096; word-break: break-all;">
          If the button above does not work, copy and paste the following link into your browser: <br/>
          <a href="${verifyUrl}" style="color: #3182ce; text-decoration: none;">${verifyUrl}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 40px; border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 12px; color: #a0aec0;">
        <p style="margin: 0 0 5px 0;">&copy; ${new Date().getFullYear()} CruseX Trading Inc. All rights reserved.</p>
        <p style="margin: 0;">This is an automated email, please do not reply.</p>
      </div>
    </div>
  `;
}
