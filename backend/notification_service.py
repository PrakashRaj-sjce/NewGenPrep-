"""
Email Notification Service for Interview Bot
Handles all email communications: invitations, reminders, confirmations, cancellations
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Dict, Optional
import asyncio


class NotificationService:
    """
    Email notification service for interview scheduling
    Supports SMTP (Gmail, SendGrid, etc.) with fallback to console logging
    """
    
    def __init__(self):
        # SMTP Configuration from environment
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@aiinterview.com")
        self.from_name = os.getenv("FROM_NAME", "AI Interview Bot")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Check if SMTP is configured
        self.is_configured = bool(self.smtp_user and self.smtp_password)
        
        if self.is_configured:
            print("INFO: Email notifications ENABLED")
        else:
            print("WARNING: Email notifications DISABLED (SMTP not configured)")
    
    async def send_interview_invitation(self, schedule: Dict) -> Dict:
        """
        Send interview invitation to candidate
        Returns: {"status": "sent|pending|failed", "message": str}
        """
        interview_link = f"{self.frontend_url}/interview/scheduled/{schedule['id']}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .details-box {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }}
                .details-box h3 {{ margin-top: 0; color: #667eea; }}
                .detail-row {{ margin: 10px 0; }}
                .detail-label {{ font-weight: bold; color: #555; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
                .button:hover {{ background: #764ba2; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
                .important {{ background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 Interview Invitation</h1>
                </div>
                <div class="content">
                    <p>Dear <strong>{schedule['candidateName']}</strong>,</p>
                    <p>Congratulations! You have been selected for an interview.</p>
                    
                    <div class="details-box">
                        <h3>Interview Details</h3>
                        <div class="detail-row">
                            <span class="detail-label">📅 Date:</span> {schedule.get('date', 'TBD')}
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">🕐 Time:</span> {schedule.get('time', 'TBD')} ({schedule.get('timezone', 'UTC')})
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏱️ Duration:</span> {schedule.get('duration', 60)} minutes
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📋 Type:</span> {schedule.get('type', 'General').title()} Interview
                        </div>
                    </div>
                    
                    <div class="important">
                        <strong>⚠️ Important:</strong> Please ensure you have:
                        <ul>
                            <li>A stable internet connection</li>
                            <li>Working webcam and microphone</li>
                            <li>A quiet, well-lit environment</li>
                            <li>Chrome or Firefox browser (latest version)</li>
                        </ul>
                    </div>
                    
                    <center>
                        <a href="{interview_link}" class="button">🚀 Start Interview</a>
                    </center>
                    
                    <p style="margin-top: 30px; font-size: 14px;">
                        {schedule.get('notes', '')}
                    </p>
                    
                    <div class="footer">
                        <p>This link will be active 15 minutes before your scheduled time.</p>
                        <p>If you have any questions, please contact us.</p>
                        <p style="margin-top: 20px; color: #999;">
                            © 2026 AI Interview Bot - Powered by AI
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self._send_email(
            to_email=schedule['candidateEmail'],
            to_name=schedule['candidateName'],
            subject=f"Interview Invitation - {schedule.get('date', 'TBD')}",
            html_body=html_body
        )
    
    async def send_reminder(self, schedule: Dict, hours_before: int) -> Dict:
        """Send reminder before interview"""
        
        interview_link = f"{self.frontend_url}/interview/scheduled/{schedule['id']}"
        
        if hours_before == 24:
            time_text = "tomorrow"
            emoji = "📅"
        elif hours_before == 1:
            time_text = "in 1 hour"
            emoji = "⏰"
        else:
            time_text = f"in {hours_before} hours"
            emoji = "⏱️"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #ffc107; color: #333; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .countdown {{ background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; border: 2px solid #ffc107; }}
                .countdown h2 {{ color: #ffc107; margin: 0; font-size: 32px; }}
                .button {{ display: inline-block; background: #ffc107; color: #333; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
                .checklist {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .checklist ul {{ list-style: none; padding: 0; }}
                .checklist li {{ padding: 8px 0; }}
                .checklist li:before {{ content: "✓ "; color: #4CAF50; font-weight: bold; margin-right: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{emoji} Interview Reminder</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>{schedule['candidateName']}</strong>,</p>
                    <p>This is a friendly reminder about your upcoming interview!</p>
                    
                    <div class="countdown">
                        <h2>Your interview is {time_text}</h2>
                        <p><strong>{schedule.get('date', 'TBD')} at {schedule.get('time', 'TBD')}</strong></p>
                    </div>
                    
                    <div class="checklist">
                        <h3>📋 Pre-Interview Checklist:</h3>
                        <ul>
                            <li>Test your camera and microphone</li>
                            <li>Ensure stable internet connection (10+ Mbps recommended)</li>
                            <li>Find a quiet, well-lit space</li>
                            <li>Have your resume ready for reference</li>
                            <li>Close unnecessary browser tabs and applications</li>
                        </ul>
                    </div>
                    
                    <center>
                        <a href="{interview_link}" class="button">Join Interview</a>
                    </center>
                    
                    <p style="margin-top: 30px; text-align: center; font-size: 14px; color: #666;">
                        Good luck! We're looking forward to meeting you.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self._send_email(
            to_email=schedule['candidateEmail'],
            to_name=schedule['candidateName'],
            subject=f"Reminder: Interview {time_text.title()}",
            html_body=html_body
        )
    
    async def send_confirmation(self, schedule: Dict) -> Dict:
        """Send confirmation when candidate confirms attendance"""
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #4CAF50;">✅ Interview Confirmed!</h2>
                <p>Hi <strong>{schedule['candidateName']}</strong>,</p>
                <p>Thank you for confirming your attendance. We've received your confirmation for the interview scheduled on:</p>
                <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>📅 {schedule.get('date', 'TBD')} at {schedule.get('time', 'TBD')}</strong></p>
                </div>
                <p>We'll send you reminders before the interview. See you soon!</p>
            </div>
        </body>
        </html>
        """
        
        return await self._send_email(
            to_email=schedule['candidateEmail'],
            to_name=schedule['candidateName'],
            subject="Interview Confirmation Received",
            html_body=html_body
        )
    
    async def send_cancellation(self, schedule: Dict, reason: Optional[str] = None) -> Dict:
        """Send cancellation notification"""
        
        reason_text = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #f44336;">❌ Interview Cancelled</h2>
                <p>Dear <strong>{schedule['candidateName']}</strong>,</p>
                <p>We regret to inform you that the interview scheduled for <strong>{schedule.get('date', 'TBD')} at {schedule.get('time', 'TBD')}</strong> has been cancelled.</p>
                {reason_text}
                <p>We apologize for any inconvenience. If you have any questions, please don't hesitate to contact us.</p>
            </div>
        </body>
        </html>
        """
        
        return await self._send_email(
            to_email=schedule['candidateEmail'],
            to_name=schedule['candidateName'],
            subject="Interview Cancellation Notice",
            html_body=html_body
        )
    
    async def _send_email(self, to_email: str, to_name: str, subject: str, html_body: str) -> Dict:
        """
        Internal method to send email via SMTP
        Returns: {"status": "sent|pending|failed", "message": str}
        """
        
        # If SMTP not configured, log to console instead (development mode)
        if not self.is_configured:
            print(f"""
------------------------------------------------------------------
                    [MOCK EMAIL NOTIFICATION]                     
------------------------------------------------------------------
 To: {to_email} ({to_name})
 Subject: {subject}
 Status: PENDING (SMTP not configured)
 
 WARNING: Set SMTP_USER and SMTP_PASSWORD in .env to enable emails
------------------------------------------------------------------
            """)
            return {
                "status": "pending",
                "message": "SMTP not configured - Email logged to console"
            }
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = f"{to_name} <{to_email}>"
            msg['Subject'] = subject
            
           # Attach HTML body
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            # Send via SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            print(f"INFO: Email sent successfully to {to_email}")
            return {
                "status": "sent",
                "message": f"Email sent to {to_email}"
            }
        
        except Exception as e:
            print(f"ERROR: Email sending failed: {e}")
            return {
                "status": "failed",
                "message": f"Failed to send email: {str(e)}"
            }


# Singleton instance
notification_service = NotificationService()
