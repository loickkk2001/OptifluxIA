# Guide d'Import de Planning avec Couleurs

## Vue d'ensemble

Le système supporte maintenant l'import de fichiers Excel de planning avec détection automatique des couleurs pour identifier les spécialités.

## Structure du fichier Excel attendu

### Format du planning

Le fichier Excel doit avoir la structure suivante :

```
| N° téléphone | LUNDI | MARDI | MERCREDI | JEUDI | VENDREDI |
|--------------|-------|-------|----------|-------|----------|
| 57295        |       |       |          |       |          |
| MATIN        | [Jaune]|       |          |       |          |
| AM           |       |[Bleu] |          |       |          |
| 52668        |       |       |          |       |          |
| MATIN        |       |       |[Vert]    |       |          |
| AM           |[Rose] |       |          |       |          |
```

### Couleurs et spécialités

Les couleurs de fond des cellules sont automatiquement détectées et mappées vers les spécialités :

- **Jaune** → `urologie`
- **Bleu clair** → `viscérale`
- **Vert** → `vasculaire`
- **Rose** → `Hépatho gastro`

### Notes importantes

1. **En-têtes requis** :
   - Première colonne doit contenir "N° téléphone" (ou variantes)
   - Colonnes suivantes : LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI

2. **Structure des lignes** :
   - Ligne avec numéro de téléphone (ex: 57295)
   - Ligne suivante : "MATIN" (ou vide, détecté automatiquement)
   - Ligne suivante : "AM" (ou "APRÈS-MIDI")

3. **Couleurs** :
   - Seules les cellules colorées (non blanches) sont prises en compte
   - Les couleurs doivent être appliquées comme couleur de fond (fill) dans Excel

## Utilisation via l'API

### Endpoint

```
POST /box_plans/upload
```

### Paramètres

- `file` (FormData, requis) : Fichier Excel
- `use_colors` (query param, bool, défaut: false) : Activer le mode avec couleurs
- `poll_id` (query param, string, requis si use_colors=true) : ID du pôle (Pôle A)
- `staff_id` (query param, string, requis si use_colors=true) : ID du cadre de santé
- `week_start_date` (query param, string, optionnel) : Date de début de semaine au format YYYY-MM-DD

### Exemple de requête

```bash
curl -X POST "http://api/box_plans/upload?use_colors=true&poll_id=507f1f77bcf86cd799439012&staff_id=507f1f77bcf86cd799439011&week_start_date=2024-12-16" \
  -F "file=@planning.xlsx"
```

## Mapping des numéros de téléphone vers les chambres

Actuellement, le système utilise le numéro de téléphone comme ID de chambre. Pour un mapping personnalisé, vous devez :

1. Créer un mapping dans votre base de données : `{numéro_téléphone: room_id}`
2. Modifier la fonction `parse_planning_excel` pour utiliser ce mapping

## Ajustement des couleurs

Si les couleurs de votre fichier Excel ne sont pas correctement détectées, vous pouvez ajuster le mapping dans `OptifluxAPI/utils/planning_parser.py` :

```python
COLOR_TO_SPECIALITY = {
    (255, 255, 0): "urologie",      # Jaune
    (173, 216, 230): "viscérale",   # Bleu clair
    (0, 255, 0): "vasculaire",     # Vert
    (255, 192, 203): "Hépatho gastro",  # Rose
    # Ajoutez vos propres couleurs ici
}
```

Pour obtenir les valeurs RGB exactes de vos couleurs Excel :
1. Ouvrez Excel
2. Sélectionnez une cellule colorée
3. Format → Format de cellule → Remplissage
4. Notez les valeurs RGB

## Format alternatif (sans couleurs)

Si vous préférez utiliser le format tabulaire classique (sans couleurs), utilisez `use_colors=false` (par défaut) et créez un fichier avec les colonnes :

| staff_id | doctors_id | poll | room | period | date | consultation_number | consultation_time | comment | status |

## Dépannage

### Les couleurs ne sont pas détectées

1. Vérifiez que les couleurs sont appliquées comme "Remplissage" (Fill) et non comme couleur de texte
2. Vérifiez que les valeurs RGB dans `COLOR_TO_SPECIALITY` correspondent à vos couleurs
3. Augmentez la tolérance dans la fonction `rgb_to_speciality` si nécessaire

### Les numéros de téléphone ne sont pas reconnus

1. Vérifiez que la colonne "N° téléphone" est bien nommée
2. Vérifiez que les numéros sont bien des nombres (pas du texte formaté)

### Les jours ne sont pas reconnus

1. Vérifiez que les en-têtes sont exactement : LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI
2. Vérifiez qu'il n'y a pas d'espaces supplémentaires

