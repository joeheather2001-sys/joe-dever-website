#!/usr/bin/env python3
"""
Automated Email Sender for Jdigitalarchitecture
Sends outreach emails to businesses automatically
"""

import smtplib
import csv
import time
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Configuration
GMAIL_EMAIL = "joe.digitalarchitect@gmail.com"
GMAIL_APP_PASSWORD = "tgunpuvlpqxnsden"
CSV_FILE = "/Users/hermes/Desktop/AI stuff/joe-dever-website/outreach_contacts.csv"
SENT_FILE = "/Users/hermes/Desktop/AI stuff/joe-dever-website/outreach_sent.csv"
DAILY_LIMIT = 10  # Emails per day

def get_template(first_name, company):
    """Generate personalized email"""
    name = first_name if first_name else "there"
    
    return f"""Hi {name},

I came across {company} and thought your business could benefit from a modern, professional website. No pressure — just sharing in case it's useful.

I'm Joe, a web developer based in Derby. I help local businesses get clean, affordable websites that actually bring in customers.

If you're curious, happy to share some examples of my work.

Cheers,
Joe

---
Jdigitalarchitecture
joe.digitalarchitect@gmail.com"""

def get_sent_today():
    """Get list of emails sent today"""
    if not os.path.exists(SENT_FILE):
        return []
    
    sent_today = []
    today = datetime.now().strftime('%Y-%m-%d')
    
    with open(SENT_FILE, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2 and row[1] == today:
                sent_today.append(row[0])
    
    return sent_today

def mark_sent(email):
    """Mark an email as sent"""
    with open(SENT_FILE, 'a') as f:
        f.write(f"{email},{datetime.now().strftime('%Y-%m-%d')}\n")

def send_email(to_email, subject, body):
    """Send email via Gmail SMTP"""
    try:
        msg = MIMEMultipart()
        msg['From'] = GMAIL_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        
        print(f"✓ Sent to: {to_email}")
        return True
    except Exception as e:
        print(f"✗ Failed to send to {to_email}: {e}")
        return False

def main():
    # Get emails sent today
    sent_today = get_sent_today()
    sent_count = len(sent_today)
    
    print(f"Emails already sent today: {sent_count}/{DAILY_LIMIT}")
    
    if sent_count >= DAILY_LIMIT:
        print("Daily limit reached. Try again tomorrow!")
        return
    
    # Read contacts
    remaining = DAILY_LIMIT - sent_count
    print(f"Can send {remaining} more emails today")
    
    with open(CSV_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if remaining <= 0:
                break
            
            email = row['email']
            
            if email in sent_today:
                print(f"Already sent to: {email} - skipping")
                continue
            
            first_name = row.get('first_name', '').strip()
            company = row.get('company', '').strip()
            
            if not company:
                print(f"Skipping {email} - no company name")
                continue
            
            print(f"Sending to: {email} ({company})...")
            
            body = get_template(first_name, company)
            success = send_email(email, "Quick question about your website", body)
            
            if success:
                mark_sent(email)
                remaining -= 1
                time.sleep(5)  # Delay between emails (Gmail friendly)
    
    print("\nDone! All remaining emails will be sent tomorrow.")

if __name__ == "__main__":
    main()
