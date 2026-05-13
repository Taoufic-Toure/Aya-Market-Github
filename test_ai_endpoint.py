#!/usr/bin/env python3
"""Test simple pour vérifier l'endpoint /ai/advisor"""

import asyncio
import httpx
import json

async def test_ai_advisor():
    """Test l'endpoint /ai/advisor avec une requête simple."""
    
    url = "http://localhost:8000/ai/advisor"
    headers = {"Content-Type": "application/json"}
    
    # Test avec une question simple
    test_data = {
        "business_type": "vente de produits",
        "question": "Comment puis-je augmenter mes ventes ?"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            print("🔍 Test de l'endpoint /ai/advisor...")
            response = await client.post(url, headers=headers, json=test_data)
            
            print(f"📊 Status: {response.status_code}")
            print(f"📝 Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Succès ! Réponse reçue :")
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
                # Vérifier que la réponse contient "Aya"
                if "Aya" in str(result):
                    print("🎉 Marque 'Aya' détectée dans la réponse !")
                else:
                    print("⚠️  Marque 'Aya' NON détectée dans la réponse")
            else:
                print(f"❌ Erreur HTTP {response.status_code}")
                print(f"📄 Réponse: {response.text}")
                
    except httpx.TimeoutException:
        print("⏰ Timeout : Le serveur ne répond pas dans les 30 secondes")
    except Exception as e:
        print(f"💥 Erreur: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_ai_advisor())
