import pandas as pd
import json
from pymongo import MongoClient


# Function to extract data from Excel and structure it into JSON
def extract_and_structure_data(file_path):
    # Load the Excel file
    xls = pd.ExcelFile(file_path)

    # Initialize dictionaries for each type of data
    all_programs = []
    monthly_programs = {}
    code_meanings = {}

    # Loop through each sheet in the Excel file
    for sheet_name in xls.sheet_names:
        # Check for 'planning' in the sheet name for annual programs
        if 'planning' in sheet_name.lower():
            # Check for 'agent' in the title and 'mois' not in the title
            if 'agent' in sheet_name.lower() and 'mois' not in sheet_name.lower():
                print(f"Processing sheet: {sheet_name}")
                # Get Agent name
                data = get_first_line(file_path, sheet_name)
                name = extract_name(data)

                # Read only the specified number of rows
                df = pd.read_excel(xls, sheet_name=sheet_name, nrows=34, header=[1, 1])

                # Remplacer les valeurs manquantes par un nombre
                df.fillna(" ", inplace=True)

                annual_program = {'name': name, 'data': {}}
                for month in df.columns.levels[0]:  # Get the unique month names from the first row
                    if month not in annual_program['data']:
                        annual_program['data'][month] = {}

                    # Populate the dictionary with line IDs for each month
                    for index in range(len(df)):
                        if index < len(df) - 1:  # Exclude the last row for regular entries
                            line_id = f"{index + 1}"  # Create a unique line ID
                            # print("month "+ df.iloc[index][month])
                            print(" plan value")
                            print(df.iloc[index][month][1])
                            #if df.iloc[index][month][1] == "":
                            #    print("yes")
                            #    break
                            annual_program['data'][month][line_id] = {
                                'day': df.iloc[index][month][0],  # Adjust based on your actual DataFrame structure
                                'plan': df.iloc[index][month][1]  # Adjust based on your actual DataFrame structure
                            }
                all_programs.append(annual_program)
                    #Good for planning Agent 2 and 1. Remains : class by month janvier to decembre and store into db before 10 or just store
            else :
                if 'agent' in sheet_name.lower() and 'mois' in sheet_name.lower():
                    print(f"Processing sheet: {sheet_name}")
                    #Get Agent name
                    name = get_first_column(file_path, sheet_name)
                    # Read the entire sheet
                    df = pd.read_excel(xls, sheet_name=sheet_name, header=2, nrows=1)  # Use multi-index for header
                    monthly_programs[name] = df.to_dict(orient='list')
                    #plan agent mois ok , we have to remove the 2 firsts elements and the last is the total hours

                else :
                    print(f"Processing sheet: {sheet_name}")



        # Check for 'code' in the sheet name for code meanings
        elif 'code' in sheet_name.lower() and 'détail' not in sheet_name.lower():
            code_meanings[sheet_name] = {}
            df = pd.read_excel(xls, sheet_name=sheet_name, header=0)
            code_meanings[sheet_name] = df.to_dict(orient='records')

        #extraction des codes dans les feuilles : 'code horaire' et 'codes à prendre en compt' ok
        #Ajouter code event et code lieu en utilisant sheet detail code

    return all_programs, code_meanings, monthly_programs

def get_first_line(file_path, sheet_name):
    df = pd.read_excel(file_path,sheet_name=sheet_name, header=None, nrows=1)

    # Get the first row
    first_row = df.to_dict(orient='records')
    #print(first_row)
    text = ''
    for element in first_row:
        for key, value in element.items():
            if isinstance(value, str):
                text = value
                break
    #print(text)
    return text

def get_first_column(file_path, sheet_name):
    df = pd.read_excel(file_path,sheet_name=sheet_name, header=3, nrows=1)
    # Get the first row
    rows = df.iloc[:, 0]
    first_value = rows.iloc[0]
    #print(first_value)
    return first_value

def extract_name(text):
    # Find the position of 'de'
    start_index = text.find('de') + 3  # Move 3 characters forward to start after 'de '

    # Extract the full name until the next 'Edité'
    end_index = text.find('Edité', start_index)  # Find 'Edité' after the start index
    if end_index != -1:
        full_name = text[start_index:end_index].strip()  # Extract and strip whitespace
    else:
        full_name = text[start_index:].strip()  # If 'Edité' is not found, take the rest

    # Print the result
    print(full_name)
    return full_name

# Function to store data in MongoDB
def store_in_mongodb(annual_programs, code_meanings, monthly_programs):
    # Connect to MongoDB
    client = MongoClient('mongodb://localhost:27017/')
    db = client['planRh']

    # Store annual programs
    #for program_name, program_data in annual_programs.items():
        # Insert the entire program dictionary
    #    db.annual_programs.insert_one({program_name: program_data})

    for program in annual_programs :
        db.annual_programs.insert_one(program)

    # Store monthly programs
    for program_name, program_data in monthly_programs.items():
        # Insert the entire program dictionary
        db.monthly_programs.insert_one({program_name: program_data})


    value_dict = {}
    # Store code meanings
    for key, value in code_meanings.items():
        if 'horaire' in key.lower():
            key = 'horaire'
        elif 'absence' in key.lower():
            key = 'absence'
        value_dict[key] = {}

        for i, element in enumerate(value):
            value_dict[key][str(i)] = element

    # Insert into MongoDB
    for value_name, value_data in value_dict.items():
        result = db.code_meanings.insert_one({value_name: value_data})
        print(f"Inserted document ID: {result.inserted_id}")


# Main execution
if __name__ == "__main__":
    file_path = '2024-12-06_plannings_et_services_et_codes_horaires.xlsx'
    annual_programs, code_meanings, monthly_programs = extract_and_structure_data(file_path)

    # Print the structured data (optional)
    #print(json.dumps(annual_programs, indent=4))
    #print(json.dumps(code_meanings, indent=4))

    # Store data in MongoDB
    store_in_mongodb(annual_programs, code_meanings,monthly_programs)