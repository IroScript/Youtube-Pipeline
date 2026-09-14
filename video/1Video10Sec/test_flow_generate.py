import asyncio
import os
import sys
import subprocess
import time
from playwright.async_api import async_playwright

PROMPT = '''Exactly 8 seconds, 9:16 vertical aspect ratio, photorealistic cinematic render, smooth continuous motion, no cuts, maximum cinematic realism. Second 1 [0:00-0:01] — HUD Popup Text: "STEP 1: ALIEN SENSOR AWAKENING" — Every concentric sensor crown across the impossible titan ignites simultaneously, generating nested cyan-violet-gold halos that sweep across continents, atmosphere and orbital space while quantum processors synchronize the entire harvesting organism. Second 2 [0:01-0:02] — HUD Popup Text: "STEP 2: OMNISCALE HARVEST" — Countless articulated harvesting arms deploy from the titan in coordinated waves, from colossal field-scale claws down to microscopic precision manipulators, while autonomous alien drones gather ripe rice and route every particle into converging intake streams. Second 3 [0:02-0:03] — HUD Popup Text: "STEP 3: IMPOSSIBLE THRESHING" — Harvested stalks plunge into gigantic rotating threshing cylinders and cyclonic separators, where mechanical force, controlled airflow and quantum-scale separation transform the crop into perfectly isolated luminous grain streams moving through the titan's endless belly factories. Second 4 [0:03-0:04] — HUD Popup Text: "STEP 4: QUANTUM-GRAVITY PURIFICATION" — Artificial gravity wells bend each grain's trajectory while electromagnetic fields remove microscopic contaminants, quantum purification chambers stabilize molecular structure, and stellar thermal loops dry the purified rice with impossible precision. Second 5 [0:04-0:05] — HUD Popup Text: "STEP 5: INFINITE STORAGE CASCADE" — Polished grains cascade through colossal magnetic arteries into vast crystalline reservoirs, each kernel individually stabilized and organized as glowing storage chambers fill in synchronized waves extending into impossible interior distances. Seconds 6-8 [0:05-0:08]: HUD text completely fades; the camera performs a continuous impossible-scale descent from the cosmic titan into its belly, through alien processing architecture, past colossal threshing cylinders, gravitational machinery, plasma conduits, crystalline reservoirs and quantum purification chambers, continuously shrinking in scale without cuts or scene transitions until it reaches a maximum close-up of a single harvested grain suspended beside a colossal quantum mechanism, the grain rotating gently while electromagnetic filaments pass around it and the surrounding machinery stabilizes into a mesmerizing continuous harvesting rhythm, no cuts, no scene transition, exactly 8 seconds.'''

async def run():
    # 1. Kill any existing chrome to ensure clean CDP bind
    subprocess.run(["pkill", "-f", "google-chrome"], check=False)
    time.sleep(1)

    # 2. Launch Chrome with CDP
    cmd = [
        "/usr/bin/google-chrome",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--remote-debugging-port=9222",
        "--user-data-dir=/home/mdkamruzzamanirak_gmail_com/.config/google-chrome",
        "--profile-directory=Profile 5",
        "https://flow.google.com/project/1b513467-e9f7-41c5-aa88-2b39ff8699b0"
    ]
    env = os.environ.copy()
    env["DISPLAY"] = ":99"
    proc = subprocess.Popen(cmd, env=env)
    print("🚀 Launched Chrome with remote debugging on port 9222")
    time.sleep(4)

    async with async_playwright() as p:
        print("🔗 Connecting via Playwright CDP...")
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()

        print("🌐 Waiting for page load...")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(3000)

        # 1. Check/Open generation settings menu
        btn_open = page.locator('button:has-text("Image"), button:has-text("Video")').first
        if await btn_open.count() > 0:
            print("⚙️ Clicking settings dropdown:", await btn_open.inner_text())
            await btn_open.click()
            await page.wait_for_timeout(1000)

        # 2. Select Video mode
        btn_vid = page.locator('div[role="option"]:has-text("Video"), button:has-text("Video")').first
        if await btn_vid.count() > 0:
            print("🎬 Selecting Video mode...")
            await btn_vid.click()
            await page.wait_for_timeout(800)

        # 3. Select 9:16 aspect ratio
        ar_btn = page.locator('button, div[role="button"]').filter(has_text='9:16').first
        if await ar_btn.count() > 0:
            print("📐 Selecting 9:16...")
            await ar_btn.click()
            await page.wait_for_timeout(500)

        # 4. Select Model
        model_dd = page.locator('div[role="combobox"], button:has-text("Veo")').first
        if await model_dd.count() > 0:
            await model_dd.click()
            await page.wait_for_timeout(500)
            veo_opt = page.locator('div:has-text("Veo 3.1 - Fast"), div:has-text("Veo 3.1 - Lite [Lower Priority]")').first
            if await veo_opt.count() > 0:
                print("🤖 Selecting model:", await veo_opt.inner_text())
                await veo_opt.click()
                await page.wait_for_timeout(500)

        # 5. Select 8s duration
        dur_8s = page.locator('button, div[role="button"]').filter(has_text='8s').first
        if await dur_8s.count() > 0:
            print("⏱️ Selecting 8s...")
            await dur_8s.click()
            await page.wait_for_timeout(500)

        # 6. Select x1 count
        count_x1 = page.locator('button, div[role="button"]').filter(has_text='x1').first
        if await count_x1.count() > 0:
            print("🔢 Selecting x1...")
            await count_x1.click()
            await page.wait_for_timeout(500)

        # 7. Close settings by clicking canvas
        await page.mouse.click(500, 300)
        await page.wait_for_timeout(1000)

        # 8. Type prompt into ProseMirror textbox
        tb = page.locator('div.ProseMirror').first
        print("✍️ Typing prompt into ProseMirror editor...")
        await tb.click()
        await tb.fill(PROMPT)
        await page.wait_for_timeout(1500)

        # 9. Verify submit button state
        submit_btn = page.locator('button[type="submit"], button[aria-label="Start generation"]').first
        is_disabled = await submit_btn.get_attribute("disabled")
        print(f"🔘 Submit button disabled attribute: {is_disabled}")

        # Screenshot before click
        await page.screenshot(path="/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e/before_submit_test.png")
        print("📸 Saved before_submit_test.png")

        if is_disabled is None or is_disabled == "false":
            print("🚀 Clicking Submit button to start Veo 3.1 generation!")
            await submit_btn.click()
            await page.wait_for_timeout(5000)
            await page.screenshot(path="/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e/after_submit_test.png")
            print("📸 Saved after_submit_test.png")
        else:
            print("⚠️ Submit button still disabled!")

        # Keep browser open for inspection
        await browser.close()
    proc.terminate()

asyncio.run(run())
