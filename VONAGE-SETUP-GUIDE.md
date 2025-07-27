# VONAGE SMS SETUP GUIDE
# How to configure SMS notifications for Quirofísicos Rocha

## 🚀 Quick Setup Steps:

### 1. Create Vonage Account
- Visit: https://www.vonage.com/communications-apis/
- Sign up for a free account (formerly Nexmo)
- Complete phone verification
- Get €2 free credit to start

### 2. Get Your Credentials
After signing up, you'll need these 3 values from your Vonage Dashboard:

**API Key** (8-digit number)
- Found in: Dashboard > Settings > API Settings
- Example: `12345678`

**API Secret** (16-character string)
- Found in: Dashboard > Settings > API Settings
- Example: `abcdef1234567890`

**From Number** (Your Vonage phone number)
- Go to: Numbers > Your Numbers
- Purchase a phone number if you don't have one
- Example: `+15551234567` or `+521234567890`

### 3. Update Your .env File
Replace the placeholder values in your .env file:

```
VONAGE_API_KEY=12345678
VONAGE_API_SECRET=abcdef1234567890
VONAGE_FROM_NUMBER=+15551234567
```

### 4. Install Dependencies and Test
```bash
npm install
node test-sms.js
```

## 📱 SMS Features Available:

✅ **Appointment Reminders**
- Automatic reminders sent before appointments
- Customizable timing and message content

✅ **Appointment Approvals** 
- Notifications when admin approves appointments
- Includes appointment details and instructions

✅ **User Verification**
- Welcome messages for new verified users
- Account confirmation notifications

✅ **Admin Notifications**
- Alerts for new appointment requests
- System status updates

## 🇲🇽 **Mexico + USA Support:**

**Excellent Coverage**:
- ✅ Mexico: All major carriers (Telcel, Movistar, AT&T Mexico)
- ✅ USA: Full coverage (Verizon, AT&T, T-Mobile, Sprint)
- ✅ Cross-border: Seamless delivery to both countries

**Smart Phone Number Detection**:
- Mexican numbers (start with 6,7,8,9): Auto-adds +52
- US numbers (start with 2,3,4,5): Auto-adds +1
- International format: Handles +52 and +1 automatically

## 💰 Pricing Information:

**Free Trial**: 
- €2 credit when you sign up
- Mexico SMS: ~$0.045 per message
- USA SMS: ~$0.0075 per message
- Phone number: ~$1/month

**Production**:
- Pay-as-you-go pricing
- Better rates than Twilio for Mexico
- Volume discounts available
- Detailed usage tracking

## 🔧 Testing Mode:

Your system currently runs in **Development Mode**:
- All SMS functions work and are logged to console
- No actual SMS messages sent (saves money during development)
- Perfect for testing and development

## 🚀 Going Live:

Once you add your Vonage credentials:
1. Install dependencies: `npm install`
2. Restart your server: `node server.js`
3. SMS notifications will automatically start working
4. Monitor usage in your Vonage Dashboard
5. Set up billing alerts if desired

## 📞 Phone Number Examples:

**Mexican Numbers**:
- `6641234567` → `+526641234567` (Tijuana)
- `5512345678` → `+525512345678` (Mexico City)
- `3312345678` → `+523312345678` (Guadalajara)

**US Numbers**:
- `6191234567` → `+16191234567` (San Diego)
- `2121234567` → `+12121234567` (New York)
- `3051234567` → `+13051234567` (Miami)

## ⚠️ Important Notes:

1. **Keep credentials secure** - Never commit them to version control
2. **Test thoroughly** - Use the test script before going live
3. **Monitor usage** - Set up billing alerts to avoid surprises
4. **Better for Mexico** - Vonage has better rates and coverage than Twilio

## 📧 Need Help?

- Vonage Documentation: https://developer.vonage.com/
- Vonage Support: Available through their dashboard
- Test script included: `test-sms.js`

---
*Your SMS system is ready to go live with better Mexico coverage and lower costs!*
