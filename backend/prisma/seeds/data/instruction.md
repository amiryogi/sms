# 1. First run comprehensive seed (if not done)
node prisma/seeds/comprehensiveSeed.js --clean

# 2. Fill in the Excel template with your data
#    (Delete row 2 instruction hints before importing)

# 3. Import from Excel
node prisma/seeds/importExcelData.js

# Or specify custom file
node prisma/seeds/importExcelData.js --file=path/to/your/file.xlsx