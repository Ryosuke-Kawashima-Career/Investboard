import {test,expect} from '@playwright/test';
import {Store} from '../../server/store';
import {manifest} from '../../server/domain';
import {snapshot} from '../../server/api';
test('recent-disclosure filter honestly returns empty and explains its rule',async({page})=>{const store=new Store(':memory:');store.set(`verified:${manifest.id}`,manifest);const s=snapshot(store);store.close();await page.route('**/api/companies',r=>r.fulfill({json:{data:s.data,meta:s.meta}}));await page.goto('/');await page.getByLabel('Discovery signal',{exact:true}).selectOption('recent-disclosure-v1');await expect(page.getByRole('heading',{name:'No companies match these filters'})).toBeVisible();await page.getByRole('button',{name:'Explain discovery signal'}).click();await expect(page.getByText(/30 calendar days in Asia\/Kolkata/)).toBeVisible();});
