import prisma from './prisma.js';

async function seedCatalogExtras() {
  console.log('--- Seeding Rich Dummy Catalog Data (25+ items per table for 20/page pagination) ---');

  // 1. Seed 25 Products with Variants
  const existingProductsCount = await prisma.product.count();
  if (existingProductsCount < 25) {
    const productsToCreate = [
      { name: 'Cloud Server Basic', price: 19.0, desc: 'Entry level virtual cloud compute instance with 2 vCPU.' },
      { name: 'Cloud Server Standard', price: 39.0, desc: 'Balanced compute and memory for production workloads.' },
      { name: 'Cloud Server Pro', price: 79.0, desc: 'High-performance cloud compute for demanding database applications.' },
      { name: 'Managed PostgreSQL Instance', price: 49.0, desc: 'Automated failover, point-in-time recovery, and connection pooling.' },
      { name: 'Managed Redis Cluster', price: 29.0, desc: 'In-memory ultra-low latency cache and message broker.' },
      { name: 'Enterprise VPN Gateway', price: 25.0, desc: 'Zero-trust network access with encrypted peer tunnels.' },
      { name: 'Edge CDN Acceleration', price: 15.0, desc: 'Global content delivery network with 300+ edge points of presence.' },
      { name: 'Dedicated Static IPv4 Pool', price: 10.0, desc: 'Block of 4 dedicated clean IPv4 addresses for ingress routing.' },
      { name: 'Automated Snapshot Backup', price: 12.0, desc: 'Hourly incremental snapshots retained across multi-region storage.' },
      { name: 'DDoS Shield Protection', price: 45.0, desc: 'Layer 3/4 and Layer 7 volumetric attack mitigation.' },
      { name: 'Object Storage 1TB', price: 20.0, desc: 'S3-compatible scalable blob storage with 99.999999999% durability.' },
      { name: 'SSL Wildcard Certificate', price: 8.0, desc: 'Automated renewal multi-domain TLS certification.' },
      { name: 'Application Load Balancer', price: 35.0, desc: 'Round-robin, least-connection, and path-based traffic distributor.' },
      { name: 'AI Inference Accelerator', price: 99.0, desc: 'Dedicated GPU acceleration for LLM inference workloads.' },
      { name: 'Log Analytics Ingestion', price: 30.0, desc: 'Full-text log indexing and real-time streaming search engine.' },
      { name: 'Continuous Security Scanner', price: 40.0, desc: 'Automated container and codebase vulnerability assessment.' },
      { name: 'Kubernetes Managed Cluster', price: 89.0, desc: 'Multi-node control plane with autoscaling worker pools.' },
      { name: 'Email Delivery Relay', price: 18.0, desc: 'High-reputation SMTP delivery with bounce analytics.' },
      { name: 'Audit Compliance Vault', price: 55.0, desc: 'Tamper-proof financial and legal records storage.' },
      { name: 'Custom Domain DNS Suite', price: 5.0, desc: 'Anycast GeoDNS with instant record propagation.' },
      { name: 'Real-time WebSocket Gateway', price: 32.0, desc: 'Managed bi-directional socket connections up to 100k clients.' },
      { name: 'API Rate Limiting Shield', price: 22.0, desc: 'Token-bucket distributed API throttling and burst protection.' },
      { name: 'Zero-Downtime Deployment Runner', price: 28.0, desc: 'Automated blue-green and canary pipeline execution.' },
      { name: 'Database Read Replica', price: 39.0, desc: 'Async read replica with sub-second replication lag.' },
      { name: 'DevOps Incident Alerting', price: 16.0, desc: 'Multi-channel paging with on-call rotation schedules.' },
    ];

    for (const p of productsToCreate) {
      const exists = await prisma.product.findFirst({ where: { name: p.name } });
      if (!exists) {
        await prisma.product.create({
          data: {
            name: p.name,
            description: p.desc,
            sales_price: p.price,
            is_active: true,
            variants: {
              create: [
                { attribute: 'Standard Tier', extra_price: 0.0 },
                { attribute: 'Premium SLA Tier', extra_price: 15.0 },
              ],
            },
          },
        });
      }
    }
    console.log('✅ Populated 25+ Products with Variants.');
  }

  // 2. Seed 25 Plans
  const existingPlansCount = await prisma.plan.count();
  if (existingPlansCount < 25) {
    const plansToCreate = [
      { name: 'Developer Starter Monthly', period: 'MONTHLY', price: 29.0, minQty: 1 },
      { name: 'Developer Starter Yearly', period: 'YEARLY', price: 290.0, minQty: 1 },
      { name: 'Professional Growth Monthly', period: 'MONTHLY', price: 79.0, minQty: 1 },
      { name: 'Professional Growth Yearly', period: 'YEARLY', price: 790.0, minQty: 1 },
      { name: 'Scale-Up Business Monthly', period: 'MONTHLY', price: 149.0, minQty: 2 },
      { name: 'Scale-Up Business Yearly', period: 'YEARLY', price: 1490.0, minQty: 2 },
      { name: 'Enterprise Cloud Monthly', period: 'MONTHLY', price: 299.0, minQty: 3 },
      { name: 'Enterprise Cloud Yearly', period: 'YEARLY', price: 2990.0, minQty: 3 },
      { name: 'Micro Service Weekly', period: 'WEEKLY', price: 12.0, minQty: 1 },
      { name: 'High-Volume Daily Plan', period: 'DAILY', price: 5.0, minQty: 1 },
      { name: 'Dedicated Infrastructure Monthly', period: 'MONTHLY', price: 499.0, minQty: 1 },
      { name: 'Dedicated Infrastructure Yearly', period: 'YEARLY', price: 4990.0, minQty: 1 },
      { name: 'Security & Compliance Monthly', period: 'MONTHLY', price: 189.0, minQty: 1 },
      { name: 'Security & Compliance Yearly', period: 'YEARLY', price: 1890.0, minQty: 1 },
      { name: 'Agency Partner Plan Monthly', period: 'MONTHLY', price: 349.0, minQty: 5 },
      { name: 'Agency Partner Plan Yearly', period: 'YEARLY', price: 3490.0, minQty: 5 },
      { name: 'Global Multi-Region Monthly', period: 'MONTHLY', price: 699.0, minQty: 1 },
      { name: 'Global Multi-Region Yearly', period: 'YEARLY', price: 6990.0, minQty: 1 },
      { name: 'High-Availability Database Monthly', period: 'MONTHLY', price: 229.0, minQty: 1 },
      { name: 'High-Availability Database Yearly', period: 'YEARLY', price: 2290.0, minQty: 1 },
      { name: 'AI Inference Compute Monthly', period: 'MONTHLY', price: 450.0, minQty: 1 },
      { name: 'AI Inference Compute Yearly', period: 'YEARLY', price: 4500.0, minQty: 1 },
      { name: 'Non-Profit Organization Monthly', period: 'MONTHLY', price: 19.0, minQty: 1 },
      { name: 'Academic Research Annual Plan', period: 'YEARLY', price: 199.0, minQty: 1 },
      { name: 'Unlimited VIP Corporate Tier', period: 'YEARLY', price: 9999.0, minQty: 10 },
    ];

    for (const pl of plansToCreate) {
      const exists = await prisma.plan.findFirst({ where: { name: pl.name } });
      if (!exists) {
        await prisma.plan.create({
          data: {
            name: pl.name,
            billing_period: pl.period,
            price: pl.price,
            min_quantity: pl.minQty,
            is_active: true,
            auto_close: false,
            closable: true,
            pausable: true,
            renewable: true,
          },
        });
      }
    }
    console.log('✅ Populated 25+ Plans.');
  }

  // 3. Seed 25 Discounts
  const existingDiscountsCount = await prisma.discount.count();
  if (existingDiscountsCount < 25) {
    const discountsToCreate = [
      { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minPurchase: 0 },
      { code: 'SPRING15', type: 'PERCENTAGE', value: 15, minPurchase: 50 },
      { code: 'SAVE20', type: 'PERCENTAGE', value: 20, minPurchase: 100 },
      { code: 'FLASH25', type: 'PERCENTAGE', value: 25, minPurchase: 150 },
      { code: 'SUMMER30', type: 'PERCENTAGE', value: 30, minPurchase: 200 },
      { code: 'FLAT15OFF', type: 'FIXED', value: 15, minPurchase: 50 },
      { code: 'FLAT25OFF', type: 'FIXED', value: 25, minPurchase: 100 },
      { code: 'FLAT50OFF', type: 'FIXED', value: 50, minPurchase: 250 },
      { code: 'FLAT100OFF', type: 'FIXED', value: 100, minPurchase: 500 },
      { code: 'ENTERPRISE12', type: 'PERCENTAGE', value: 12, minPurchase: 300 },
      { code: 'LOYALTY5', type: 'PERCENTAGE', value: 5, minPurchase: 0 },
      { code: 'STARTUP50', type: 'FIXED', value: 50, minPurchase: 150 },
      { code: 'CYBERWEEK', type: 'PERCENTAGE', value: 35, minPurchase: 250 },
      { code: 'BLACKFRIDAY', type: 'PERCENTAGE', value: 40, minPurchase: 300 },
      { code: 'EARLYBIRD', type: 'PERCENTAGE', value: 18, minPurchase: 80 },
      { code: 'PARTNER20', type: 'PERCENTAGE', value: 20, minPurchase: 120 },
      { code: 'DEVCOMMUNITY', type: 'FIXED', value: 30, minPurchase: 90 },
      { code: 'STUDENTPASS', type: 'PERCENTAGE', value: 50, minPurchase: 0 },
      { code: 'RENEWALBONUS', type: 'FIXED', value: 45, minPurchase: 180 },
      { code: 'UPGRADE25', type: 'PERCENTAGE', value: 25, minPurchase: 200 },
      { code: 'QUARTERLY10', type: 'PERCENTAGE', value: 10, minPurchase: 100 },
      { code: 'ANNUALBONUS', type: 'FIXED', value: 150, minPurchase: 1000 },
      { code: 'FOUNDERSCLUB', type: 'PERCENTAGE', value: 22, minPurchase: 150 },
      { code: 'LAUNCHSPECIAL', type: 'FIXED', value: 35, minPurchase: 100 },
      { code: 'GROWTHBOOST', type: 'PERCENTAGE', value: 15, minPurchase: 120 },
    ];

    for (const d of discountsToCreate) {
      const exists = await prisma.discount.findUnique({ where: { code: d.code } });
      if (!exists) {
        await prisma.discount.create({
          data: {
            code: d.code,
            type: d.type,
            value: d.value,
            min_purchase: d.minPurchase,
            is_active: true,
            max_redemptions: 1000,
            scope: 'SUBSCRIPTION',
          },
        });
      }
    }
    console.log('✅ Populated 25+ Discounts.');
  }

  // 4. Seed 20 Taxes
  const existingTaxesCount = await prisma.tax.count();
  if (existingTaxesCount < 20) {
    const taxesToCreate = [
      { name: 'GST Standard 18%', rate: 18.0 },
      { name: 'VAT Standard 20%', rate: 20.0 },
      { name: 'State Sales Tax 8.25%', rate: 8.25 },
      { name: 'Reduced VAT 5%', rate: 5.0 },
      { name: 'Zero-Rated Export 0%', rate: 0.0 },
      { name: 'California Sales Tax 7.25%', rate: 7.25 },
      { name: 'New York City Tax 8.875%', rate: 8.88 },
      { name: 'Texas Sales Tax 6.25%', rate: 6.25 },
      { name: 'Washington State Tax 6.5%', rate: 6.5 },
      { name: 'UK Standard VAT 20%', rate: 20.0 },
      { name: 'EU Digital Services Tax 19%', rate: 19.0 },
      { name: 'Canada GST 5%', rate: 5.0 },
      { name: 'Ontario HST 13%', rate: 13.0 },
      { name: 'Australia GST 10%', rate: 10.0 },
      { name: 'Singapore GST 9%', rate: 9.0 },
      { name: 'Japan Consumption Tax 10%', rate: 10.0 },
      { name: 'Germany MwSt 19%', rate: 19.0 },
      { name: 'France TVA 20%', rate: 20.0 },
      { name: 'India IGST 18%', rate: 18.0 },
      { name: 'Municipal Service Fee 2.5%', rate: 2.5 },
    ];

    for (const t of taxesToCreate) {
      const exists = await prisma.tax.findFirst({ where: { name: t.name } });
      if (!exists) {
        await prisma.tax.create({
          data: {
            name: t.name,
            rate: t.rate,
            is_active: true,
          },
        });
      }
    }
    console.log('✅ Populated 20+ Taxes.');
  }

  // 5. Seed 20 Quotation Templates
  const allPlans = await prisma.plan.findMany();
  const allProds = await prisma.product.findMany();
  const existingTemplatesCount = await prisma.quotationTemplate.count();

  if (existingTemplatesCount < 20 && allPlans.length > 0 && allProds.length > 0) {
    const templateNames = [
      'Enterprise Complete Cloud Suite',
      'Startup MVP Quick Launch',
      'High-Traffic E-Commerce Bundle',
      'Data Engineering Pipeline Pack',
      'Managed Kubernetes Production Tier',
      'Security Hardened Zero-Trust Stack',
      'Global Multi-Region SaaS Base',
      'Disaster Recovery Failover Bundle',
      'Microservices Fleet Architecture',
      'AI & Machine Learning Sandbox',
      'Developer Team Collaboration Suite',
      'Financial Compliance Vault Package',
      'Healthcare HIPAA Certified Stack',
      'Media Streaming & Transcoding Fleet',
      'Enterprise Email & Identity Bundle',
      'Dedicated Private Cloud Instance',
      'Hybrid Cloud Bridge Architecture',
      'Continuous Integration Enterprise Hub',
      'High-Frequency Trading Network Pod',
      'Government & Defense Hardened Pod',
    ];

    for (let i = 0; i < templateNames.length; i++) {
      const name = templateNames[i];
      const exists = await prisma.quotationTemplate.findFirst({ where: { name } });
      if (!exists) {
        const p = allPlans[i % allPlans.length];
        const prod = allProds[i % allProds.length];
        await prisma.quotationTemplate.create({
          data: {
            name,
            description: `Pre-configured architecture bundle for ${name}`,
            quotation_valid_days: 15 + (i % 30),
            lines: {
              create: [
                {
                  product_id: prod.id,
                  quantity: 1,
                  unit_price: prod.sales_price,
                },
              ],
            },
          },
        });
      }
    }
    console.log('✅ Populated 20+ Quotation Templates.');
  }

  console.log('--- Finished Seeding Rich Dummy Catalog Data ---');
}

seedCatalogExtras()
  .catch((err) => {
    console.error('Seeding extras failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
