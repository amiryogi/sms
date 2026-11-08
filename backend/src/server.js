const app = require('./app');
const { prisma, disconnect, label } = require('./database');

const PORT = process.env.PORT || 5000;

// =====================================================
// DATABASE CONNECTION CHECK
// =====================================================

async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log(`✅ Database connected successfully (${label})`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  console.log('\n🚀 Starting School Management System API...\n');

  // Check database connection
  const dbConnected = await checkDatabaseConnection();
  
  if (!dbConnected) {
    console.error('⚠️  Server starting without database connection');
    console.error('   Please check your DATABASE_URL in .env file\n');
  }

  app.listen(PORT, () => {
    console.log(`\n✅ Server is running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   API Base URL: http://localhost:${PORT}/api`);
    console.log('\n📚 Available endpoints:');
    console.log('   POST   /api/auth/login');
    console.log('   POST   /api/auth/register');
    console.log('   POST   /api/auth/refresh-token');
    console.log('   GET    /api/users');
    console.log('   GET    /api/students');
    console.log('   GET    /api/teachers');
    console.log('   GET    /api/academic-years');
    console.log('   GET    /api/classes');
    console.log('   GET    /api/sections');
    console.log('   GET    /api/subjects');
    console.log('   ... and more\n');
  });
}

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  await disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  await disconnect();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start the server
startServer();
