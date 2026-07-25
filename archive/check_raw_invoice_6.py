import pyodbc

def main():
    server = r'.\SQLEXPRESS'
    db_name = 'TEMP_VAL_DB'
    mdf_path = r'c:\Users\Irak\Desktop\Barishal April Data\Barishal_Temp\Data\ERPonTheNet_Data.MDF'
    ldf_path = r'c:\Users\Irak\Desktop\Barishal April Data\Barishal_Temp\Data\ERPonTheNet_log.LDF'
    
    conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE=master;Trusted_Connection=yes;'
    conn = pyodbc.connect(conn_str)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Detach if exists
    cursor.execute(f"SELECT database_id FROM sys.databases WHERE name = '{db_name}'")
    if cursor.fetchone():
        cursor.execute(f"ALTER DATABASE [{db_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE")
        cursor.execute(f"EXEC sp_detach_db '{db_name}', 'true'")
        
    # Attach
    cursor.execute(f"CREATE DATABASE [{db_name}] ON (FILENAME = N'{mdf_path}'), (FILENAME = N'{ldf_path}') FOR ATTACH;")
    
    # Query invoice details
    cursor.execute(f"SELECT xordernum, xdate, ztime FROM [{db_name}].dbo.opord WHERE xordernum = 'IN--000513'")
    rows = cursor.fetchall()
    print("Raw SQL row details:")
    for r in rows:
        print(f"  Invoice: {r[0]} | Date Type: {type(r[1])} Value: {r[1]} | Time Type: {type(r[2])} Value: {r[2]}")
        
    # Detach
    cursor.execute(f"ALTER DATABASE [{db_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE")
    cursor.execute(f"EXEC sp_detach_db '{db_name}', 'true'")
    conn.close()

if __name__ == '__main__':
    main()
