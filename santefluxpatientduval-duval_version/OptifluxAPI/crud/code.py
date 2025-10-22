from fastapi import HTTPException

from database.database import programs, codes
from utils.code import extract_code
from utils.program import extract_annual_programs


async def create_code(code_info):
    try:
        code_meanings = extract_code(code_info['path'])
        # Sore code_meanings
        values_dict = {}
        # Store code meanings
        for key, value in code_meanings.items():
            if 'horaire' in key.lower():
                key = 'horaire'
            elif 'absence' in key.lower():
                key = 'absence'
            values_dict[key] = {}

            for i, element in enumerate(value):
                values_dict[key][str(i)] = element

        # Insert into MongoDB
        for value_name, value_data in values_dict.items():
            result = codes.insert_one({value_name: value_data})
            print(f"Inserted document ID: {result.inserted_id}")

        print("Programme inséré avec succès")

        return {"message": "Programme inséré avec succès", "program": str(code_meanings)}

    except Exception as e:
        print(f"Erreur lors de la création de l'utilisateur : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")