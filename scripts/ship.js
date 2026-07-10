import { execSync } from 'child_process';

// Get commit message from command line args or use default
const commitMessage = process.argv.slice(2).join(' ') || 'build: ship update';

try {
  // 1. Safety Check: Verify .env is properly ignored by Git
  try {
    execSync('git check-ignore -q .env');
    console.log('🛡️ Safety check passed: .env is correctly gitignored.');
  } catch (err) {
    // git check-ignore returns exit code 1 if file is NOT ignored
    console.error('\n❌ ERROR: .env is not ignored by git! Please add .env to your .gitignore before shipping.');
    process.exit(1);
  }

  // 2. Build project
  console.log('\n🚀 Building Ionic project...');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. Deploy to Firebase
  console.log('\n🔥 Deploying to Firebase Hosting...');
  execSync('firebase deploy --only hosting', { stdio: 'inherit' });

  // 4. Git operations
  console.log('\n📦 Staging files for Git...');
  execSync('git add .', { stdio: 'inherit' });

  console.log(`\n💬 Committing changes: "${commitMessage}"...`);
  // Escape quotes in the commit message safely
  const escapedMessage = commitMessage.replace(/"/g, '\\"');
  execSync(`git commit -m "${escapedMessage}"`, { stdio: 'inherit' });

  console.log('\n📤 Pushing to Git...');
  execSync('git push', { stdio: 'inherit' });

  console.log('\n✅ Shipped successfully! 🚀');
} catch (error) {
  console.error('\n❌ Ship command failed!');
  process.exit(1);
}
