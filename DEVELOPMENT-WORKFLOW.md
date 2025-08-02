# Development Workflow Guide
## Quirofísicos Rocha - Professional Development Procedures

### 🔄 Development Lifecycle

#### 1. **Feature Development Process**
```bash
# 1. Start from main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-feature-name
# Examples: feature/online-payments, feature/patient-history, feature/email-notifications

# 3. Develop and test locally
npm run dev          # Start development server
npm run test         # Run tests (when implemented)
mysql -u root -p     # Test database changes

# 4. Commit changes with clear messages
git add .
git commit -m "feat: add online payment integration with Stripe"

# 5. Push and create Pull Request
git push origin feature/new-feature-name
# Create PR on GitHub for code review
```

#### 2. **Branch Strategy**
- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/*`** - Individual feature development
- **`hotfix/*`** - Emergency production fixes
- **`release/*`** - Prepare releases

#### 3. **Daily Development Routine**

**Morning Setup:**
```bash
git checkout main
git pull origin main
npm install                    # Update dependencies
mysql -u root -pkimpembe < db/schema.sql  # Sync database if needed
npm run dev                    # Start development server
```

**During Development:**
- Test changes locally at `http://localhost:3001`
- Use browser dev tools for frontend debugging
- Check server logs for backend issues
- Test SMS functionality (development mode)
- Verify database changes with MySQL Workbench

**End of Day:**
```bash
git add .
git commit -m "wip: working on appointment notifications"
git push origin feature/current-feature
```

### 🧪 Testing Strategy

#### Local Testing Checklist:
- [ ] All forms submit correctly
- [ ] Database operations work
- [ ] SMS notifications log properly
- [ ] Admin panel functions work
- [ ] User authentication flows
- [ ] Appointment booking process
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

#### Pre-Production Testing:
- [ ] Load testing with multiple concurrent users
- [ ] Security audit (SQL injection, XSS)
- [ ] Database backup/restore procedures
- [ ] SSL certificate validation
- [ ] Performance optimization
- [ ] Error handling and logging

### 📱 Feature Implementation Examples

#### Adding New Features:
1. **Database Changes:**
   ```sql
   -- Add new columns to existing tables
   ALTER TABLE appointments ADD COLUMN payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending';
   ```

2. **Backend API:**
   ```javascript
   // Add new route in routes/apiRoutes.js
   router.post('/payments/process', paymentController.processPayment);
   ```

3. **Frontend Integration:**
   ```javascript
   // Add new admin section in adminOptions.js
   case 'payments-management':
     await this.loadPaymentsData();
     break;
   ```

4. **SMS Notifications:**
   ```javascript
   // Extend SMS service for new notifications
   await smsService.sendPaymentConfirmation(appointment, user);
   ```

### 🔧 Development Environment Setup

#### Required Tools:
- **Node.js 18+** - JavaScript runtime
- **MySQL 8.0+** - Database server
- **Git** - Version control
- **VS Code** - IDE with extensions:
  - MySQL extension
  - GitLens
  - ES6 Modules
  - Prettier Code formatter

#### Environment Variables:
```bash
# Development .env
NODE_ENV=development
DEBUG_MODE=true
DB_HOST=localhost
SMS_MODE=development
WEBSITE_URL=http://localhost:3001
```

### 📊 Monitoring & Maintenance

#### Weekly Tasks:
- Review server logs for errors
- Check database performance
- Update dependencies: `npm audit && npm update`
- Backup database: `mysqldump -u root -p appointments_db > backup_$(date +%Y%m%d).sql`
- Test SMS service functionality
- Review admin user actions

#### Monthly Tasks:
- Security updates
- Performance optimization
- User feedback review
- Feature planning
- Database optimization
- Server resource monitoring

### 🚀 Release Process

#### Before Each Release:
1. **Code Review:** All PRs reviewed by team lead
2. **Testing:** Complete testing checklist
3. **Documentation:** Update API docs and user guides
4. **Database Migration:** Test schema changes
5. **Backup:** Full production backup
6. **Deploy:** Staged deployment process

#### Release Naming:
- **Major:** v2.0.0 - Breaking changes, major features
- **Minor:** v1.1.0 - New features, backwards compatible
- **Patch:** v1.0.1 - Bug fixes, security patches

---

## 🎯 Next: See PRODUCTION-SETUP.md for deployment guide
