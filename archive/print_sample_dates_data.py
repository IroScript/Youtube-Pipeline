import os
import gspread
from google.oauth2.credentials import Credentials

BASE_DIR = r"C:\Users\Irak\Desktop\deskTop\Cash in Hand and Dic Adjustment"
TOKEN_FILE = os.path.join(BASE_DIR, "FieldEdit", "token.json")
CTGA_SHEET_ID = "1FtzKzmySZOZ9mYvMLXGM9b1ar0Thtm3mIm6ihAugZDA"

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

try:
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    gc = gspread.authorize(creds)
    sheet = gc.open_by_key(CTGA_SHEET_ID)
    ws = sheet.get_worksheet(0)
    rows = ws.get_all_values()
    print("Row 11 to 25:")
    for idx, r in enumerate(rows[10:25]):
        print(f"Row {idx+11}: {r[:15]}")
except Exception as e:
    print(f"Error: {e}")
