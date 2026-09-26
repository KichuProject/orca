import asyncio
import edge_tts

async def main():
    voices = await edge_tts.list_voices()
    for v in sorted(voices, key=lambda x: x['ShortName']):
        if '-IN' in v['Locale'] or 'Odia' in v.get('FriendlyName', '') or 'Oriya' in v.get('FriendlyName', ''):
            print(f"{v['Locale']}: {v['ShortName']} ({v.get('Gender')})")

asyncio.run(main())
