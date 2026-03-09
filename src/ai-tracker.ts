import axios from 'axios';
import * as fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FEISHU_WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL;

async function getTrendingAIProjects() {
  const response = await axios.get(
    'https://api.github.com/search/repositories?q=ai+agent+stars:>100&sort=stars&per_page=10',
    {
      headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    }
  );
  
  return response.data.items.map((repo: any) => ({
    name: repo.full_name,
    stars: repo.stargazers_count,
    description: repo.description?.substring(0, 80),
    url: repo.html_url,
    language: repo.language
  }));
}

async function sendToFeishu(projects: any[]) {
  if (!FEISHU_WEBHOOK_URL) {
    console.log('⚠️  未配置 FEISHU_WEBHOOK_URL，跳过推送');
    return;
  }
  
  const message = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '🔥 今日热门 AI 项目' },
        template: 'blue'
      },
      elements: [
        {
          tag: 'div',
          fields: projects.slice(0, 5).map((p, i) => ({
            is_short: false,
            text: {
              tag: 'lark_md',
              content: `**${i + 1}. ${p.name}** ⭐${p.stars.toLocaleString()}\n${p.description}\n[查看项目](${p.url})`
            }
          }))
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看完整列表' },
              url: 'https://github.com/Yuan9527-ai/ai-daily-reporter',
              type: 'primary'
            }
          ]
        }
      ]
    }
  };
  
  await axios.post(FEISHU_WEBHOOK_URL, message);
  console.log('✅ 已推送到飞书');
}

async function main() {
  console.log('🔍 正在追踪热门 AI 项目...\n');
  
  const projects = await getTrendingAIProjects();
  
  console.log(`✅ 找到 ${projects.length} 个项目\n`);
  projects.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (⭐${p.stars.toLocaleString()})`);
    console.log(`   ${p.description}`);
    console.log(`   Language: ${p.language}\n`);
  });
  
  await sendToFeishu(projects);
  
  // 保存报告
  const report = `# 🔥 今日热门 AI 项目\n\n${projects.map((p, i) => 
    `${i + 1}. **${p.name}** (⭐${p.stars.toLocaleString()})\n   ${p.description}\n   [查看](${p.url})`
  ).join('\n\n')}`;
  
  const filename = `ai-projects-${new Date().toISOString().split('T')[0]}.md`;
  fs.writeFileSync(filename, report);
  console.log(`\n✅ 报告已保存: ${filename}`);
}

main().catch(console.error);
