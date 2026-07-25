import sqlite3
import os

db_path = r"C:\Users\Irak\Desktop\Barishal April Data - Copy\New folder\Alco-Depot-Data-Extractor\sales.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get table info (columns)
cur.execute("PRAGMA table_info(sales)")
columns = [row["name"] for row in cur.fetchall()]
print("Sales Table Columns:", columns)

# Get sample records with calculations
# Let's group by product_code and calculate the Unit Price = SUM(line_amount) / SUM(quantity)
# We will show sample calculations for the 6 Strategic Products
strategic_products_codes = ['ALK1', 'ALM1', 'ZA04', 'ZA05', 'ALN1', 'ALP1', 'AMK3', 'AMM3', 'ZA11', 'DEJ1', 'DEK1', 'DEM1', 'DEN1', 'ZD01', 'MON1', 'MOO1', 'MOP1', 'TOL2']

print("\n--- Unit Price Sample Queries (Grouped by Product Code) ---")
cur.execute(f"""
    SELECT 
        product_code,
        SUM(quantity) as total_units,
        SUM(line_amount) as total_sales,
        SUM(line_amount) / SUM(quantity) as calculated_unit_price
    FROM sales
    WHERE product_code IN ({','.join(['?'] * len(strategic_products_codes))})
    GROUP BY product_code
""", strategic_products_codes)

for row in cur.fetchall():
    print(f"Product Code: {row['product_code']} | Total Units: {row['total_units']:.2f} | Total Value: BDT {row['total_sales']:.2f} | Calculated Price/Unit: BDT {row['calculated_unit_price']:.4f}")

print("\n--- Individual Raw Sales Transaction Samples ---")
cur.execute(f"""
    SELECT 
        invoice_no,
        product_code,
        quantity,
        line_amount,
        (line_amount / quantity) as transaction_unit_price
    FROM sales
    WHERE product_code IN ('MON1', 'ALK1', 'TOL2')
    LIMIT 5
""")
for row in cur.fetchall():
    print(f"Inv: {row['invoice_no']} | Prod: {row['product_code']} | Qty: {row['quantity']} | Val: BDT {row['line_amount']} | Unit Price: BDT {row['transaction_unit_price']:.4f}")
