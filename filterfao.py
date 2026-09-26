import pandas as pd

# Load the global CSVs
cap = pd.read_csv("E:/sih/data/fao/Capture_Quantity.csv", encoding="latin1")
aqua = pd.read_csv("E:/sih/data/fao/Aquaculture_Quantity.csv", encoding="latin1")
val = pd.read_csv("E:/sih/data/fao/Aquaculture_Value.csv", encoding="latin1")

# Filter for India (UN Code = 356)
india_cap = cap[cap["COUNTRY.UN_CODE"] == 356]
india_aqua = aqua[aqua["COUNTRY.UN_CODE"] == 356]
india_val = val[val["COUNTRY.UN_CODE"] == 356]

# Save India-only files
india_cap.to_csv("E:/sih/data/fao/india_capture.csv", index=False)
india_aqua.to_csv("E:/sih/data/fao/india_aquaculture.csv", index=False)
india_val.to_csv("E:/sih/data/fao/india_aqua_value.csv", index=False)

print(f"✅ India capture rows: {len(india_cap)}")
print(f"✅ India aquaculture rows: {len(india_aqua)}")
print(f"✅ India aquaculture value rows: {len(india_val)}")
print("Years covered:", sorted(india_cap["PERIOD"].unique())[:5], "...", sorted(india_cap["PERIOD"].unique())[-3:])