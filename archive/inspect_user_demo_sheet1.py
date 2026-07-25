import os, json, gspread
from google.oauth2.credentials import Credentials

BASE_DIR = r'C:\Users\Irak\Desktop\deskTop\Cash in Hand and Dic Adjustment'
TOKEN_FILE = os.path.join(BASE_DIR, 'FieldEdit', 'token.json')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']

creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
gc = gspread.authorize(creds)

depot_sid = '1OYVbs61x04YDXZ2Xp46iALhrRHmcqe5_n8fJpZVwHGQ'
doc = gc.open_by_key(depot_sid)
ws = doc.worksheet('Sheet1')

print(f"=== Sheet1 ('Sheet1' / GID 1585840925) ===")

vals = ws.get_all_values()
formulas = ws.get('A1:AZ60', value_render_option='FORMULA')

print(f"Total rows: {len(vals)}")
for r_idx in range(len(vals)):
    v_row = vals[r_idx]
    f_row = formulas[r_idx] if r_idx < len(formulas) else []
    col_parts = []
    for c_idx in range(min(25, max(len(v_row), len(f_row)))):
        val = v_row[c_idx] if c_idx < len(v_row) else ''
        form = f_row[c_idx] if c_idx < len(f_row) else ''
        if str(form).startswith('='):
            col_parts.append(f"C{c_idx+1}: FORM={form}")
        elif val:
            col_parts.append(f"C{c_idx+1}: {val}")
    if col_parts:
        print(f"Row {r_idx+1:2d}: " + " | ".join(col_parts[:8]))
