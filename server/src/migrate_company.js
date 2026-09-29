import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Company } from './models/Company.js';
import { Lead } from './models/Lead.js';
import { CompanyProfile } from './models/CompanyProfile.js';
import { IntegrationConfig } from './models/IntegrationConfig.js';

let defaultCompanyEnsured = false;

export async function ensureDefaultCompany() {
  if (defaultCompanyEnsured) return;

  const companyName = 'Apex AI & Cloud Solutions';
  const companyKey = companyName.trim().toLowerCase();

  let apexCompany = await Company.findOne({ companyKey });
  if (!apexCompany) {
    const hashedPassword = await bcrypt.hash('apex123', 10);
    apexCompany = await Company.create({
      companyName,
      companyKey,
      password: hashedPassword
    });
    console.log(`[Auth Migration] Created initial company: "${apexCompany.companyName}" (ID: ${apexCompany._id})`);
  }

  // Update existing unassigned leads
  const leadsResult = await Lead.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: apexCompany._id } }
  );
  if (leadsResult.modifiedCount > 0) {
    console.log(`[Auth Migration] Migrated ${leadsResult.modifiedCount} leads to "${apexCompany.companyName}".`);
  }

  // Update existing unassigned company profile
  const profileResult = await CompanyProfile.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: apexCompany._id, name: apexCompany.companyName } }
  );
  if (profileResult.modifiedCount > 0) {
    console.log(`[Auth Migration] Migrated ${profileResult.modifiedCount} profiles to "${apexCompany.companyName}".`);
  }

  // Update existing unassigned integration config
  const configResult = await IntegrationConfig.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: apexCompany._id } }
  );
  if (configResult.modifiedCount > 0) {
    console.log(`[Auth Migration] Migrated ${configResult.modifiedCount} integration configs to "${apexCompany.companyName}".`);
  }

  // Ensure QuminAI workspace
  const quminKey = 'quminai';
  let quminCompany = await Company.findOne({ companyKey: quminKey });
  const quminHashed = await bcrypt.hash('Qumin@2026', 10);
  if (!quminCompany) {
    quminCompany = await Company.create({
      companyName: 'QuminAI',
      companyKey: quminKey,
      password: quminHashed
    });
    console.log(`[Auth Migration] Created initial company: "${quminCompany.companyName}" (ID: ${quminCompany._id})`);
  } else {
    quminCompany.password = quminHashed;
    await quminCompany.save();
  }

  // Ensure all unassigned or legacy leads belong to QuminAI
  const quminLeadsCount = await Lead.countDocuments({ companyId: quminCompany._id });
  if (quminLeadsCount === 0) {
    await Lead.updateMany(
      { $or: [{ companyId: apexCompany._id }, { companyId: null }, { companyId: { $exists: false } }] },
      { $set: { companyId: quminCompany._id } }
    );
  }

  // Ensure Company Profile for QuminAI
  const quminProfile = await CompanyProfile.findOne({ companyId: quminCompany._id });
  if (!quminProfile) {
    await CompanyProfile.create({
      companyId: quminCompany._id,
      name: 'QuminAI',
      tagline: 'Autonomous AI Sales Operations & Pipeline Intelligence',
      senderName: 'QuminAI Team'
    });
  }

  // Ensure Integration Config for QuminAI
  const quminConfig = await IntegrationConfig.findOne({ companyId: quminCompany._id });
  if (!quminConfig) {
    await IntegrationConfig.create({
      companyId: quminCompany._id,
      geminiModel: 'gemini-3.5-flash-lite'
    });
  }

  defaultCompanyEnsured = true;
  return apexCompany;
}

if (process.argv[1] && process.argv[1].includes('migrate_company.js')) {
  await mongoose.connect('mongodb://127.0.0.1:27017/ssoc');
  console.log('Connected to MongoDB.');
  await ensureDefaultCompany();
  await mongoose.disconnect();
  console.log('Done.');
}
