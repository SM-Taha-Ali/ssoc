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
