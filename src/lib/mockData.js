import { pairId } from './schema'
const now = Date.now()
const users = [
  ['u1','Aanya Shah','North Campus',['UI/UX','Music','Design'],['Figma','Design','React'],['Python','Data Analysis'],['friends','project_mate'],'Product designer & CS junior crafting intuitive interfaces. Building campus hackathon projects, love design jams, typography, and indie lo-fi beats.'],
  ['u2','Rohan Mehta','North Campus',['Gaming','AI','Startups'],['Python','JavaScript','C++'],['Figma','React'],['study_partner','project_mate'],'CS & AI sophomore experimenting with local LLMs and computer vision. Looking for a study partner for machine learning and a teammate for upcoming hackathons.'],
  ['u3','Maya Iyer','North Campus',['Photography','Travel','Film'],['Photography','Video Editing','Marketing'],['Design','UI/UX'],['friends','study_partner'],'Visual arts & journalism student shooting campus street photography and short documentaries. Happy to teach photo editing and color grading in exchange for UI/UX basics.'],
  ['u4','Arjun Rao','South Campus',['Books','Writing','Debate'],['Writing','Public Speaking','Research'],['Python','UI/UX'],['mentor','friends'],'Literature major and debate club captain. Avid reader and creative non-fiction writer. Can help with essay structuring, research papers, and public speaking.'],
  ['u5','Nisha Kumar','North Campus',['Design','Film','Art'],['Illustration','Figma','Design'],['JavaScript','Photography'],['friends','project_mate'],'Graphic designer and film enthusiast. Working on illustrated zines and experimental motion graphics. Always looking for creative collaborators and project partners.'],
  ['u6','Dev Patel','Tech Park Campus',['Robotics','Gaming','AI'],['C++','Python','Math'],['React','Design','UI/UX'],['study_partner','project_mate'],'Mechatronics junior tinkering with robotics, microcontrollers, and game dev in C++. Looking for a study partner to master data structures and algorithms.'],
  ['u7','Sara Ali','North Campus',['Fitness','Cooking','Startups'],['Marketing','Leadership','Excel'],['Data Analysis','Python'],['friends','mentor'],'Business & economics student interested in sustainability and clean energy startups. Marathon runner, loves group fitness, financial modeling, and campus leadership.'],
  ['u8','Kabir Singh','Arts Campus',['Music','Art','Fashion'],['Guitar','Illustration','Music'],['JavaScript','Figma'],['friends','project_mate'],'Acoustic guitarist and digital illustrator. Combining audio engineering with vector art. Looking for friends to jam with or exchange creative skills.'],
  ['u9','Zara Chen','North Campus',['UI/UX','Fashion','Design'],['Figma','Marketing','Illustration'],['Python','React'],['project_mate','friends'],'Industrial design junior obsessed with sustainable fashion tech and micro-interactions in design systems. Looking for a frontend developer to bring portfolio mockups to life.'],
  ['u10','Ishaan Verma','North Campus',['AI','Robotics','Gaming'],['Python','Math','Data Analysis'],['React','Public Speaking'],['study_partner','project_mate'],'Data science junior building reinforcement learning models for drone navigation. Love late-night coding sessions and breaking down complex math.'],
  ['u11','Diya Nambiar','Central Campus',['Film','Books','Writing'],['Video Editing','Writing','Photography'],['Figma','Marketing'],['friends','study_partner'],'Cinema studies sophomore directing an episodic student web series. Need help with brand identity and graphics, can teach video editing and script coverage.'],
  ['u12','Aditya Sharma','North Campus',['Startups','Fitness','AI'],['React','JavaScript','SQL'],['Public Speaking','Marketing'],['project_mate','mentor'],'Full-stack web engineer and campus entrepreneurship coordinator. Built two side-projects with active student users; looking for a growth marketer to partner with.'],
  ['u13','Meera Joshi','Arts Campus',['Art','Design','Volunteering'],['Illustration','Design','Photography'],['Python','Excel'],['friends','mentor'],'Fine arts senior exploring generative art installations and community mural projects. Happy to exchange creative mentoring for tech and data skills.'],
  ['u14','Tanmay Kulkarni','Tech Park Campus',['Gaming','Robotics','Startups'],['C++','Python','Leadership'],['Figma','UI/UX'],['study_partner','project_mate'],'Hardware enthusiast & competitive programmer. Developing a low-latency game engine; looking for someone with an eye for UI and sound design.'],
  ['u15','Ananya Sen','North Campus',['Books','Debate','Sustainability'],['Research','Writing','Public Speaking'],['Data Analysis','Python'],['mentor','study_partner'],'Public policy and international relations senior. Experienced in parliamentary debate and academic publishing. Want to learn data scraping and visualization.'],
  ['u16','Vikram Singhania','Central Campus',['Music','Travel','Photography'],['Guitar','Photography','Video Editing'],['React','JavaScript'],['friends','project_mate'],'Audio engineering student producing indie beats and travel vlogs. Learning web development to launch an interactive audio streaming site.'],
  ['u17','Pooja Hegde','North Campus',['UI/UX','AI','Startups'],['Figma','Design','React'],['Python','SQL'],['project_mate','study_partner'],'Human-computer interaction researcher designing assistive tech interfaces. Looking for machine learning study partners and hackathon collaborators.'],
  ['u18','Rahul Nair','South Campus',['Fitness','Gaming','Cooking'],['Leadership','Excel','Math'],['Python','Design'],['friends','study_partner'],'Kinesiology and sports analytics student. Track athlete who loves meal prepping, statistics, and building fantasy sports prediction models.'],
  ['u19','Sanya Kapoor','North Campus',['Fashion','Photography','Marketing'],['Marketing','Photography','Writing'],['UI/UX','Figma'],['friends','project_mate'],'Fashion merchandising student running an active campus thrifting collective. Looking for a product designer to co-build a campus clothing swap web app.'],
  ['u20','Kunal Deshmukh','Tech Park Campus',['AI','Gaming','Books'],['Python','React','C++'],['Figma','Public Speaking'],['study_partner','project_mate'],'Cybersecurity and systems engineering student. CTF competitor and open-source contributor looking for project mates to build decentralized campus tools.'],
  ['mod1','Jordan Lee','North Campus',['Sustainability','Volunteering','Debate'],['Leadership','Research','Public Speaking'],['Data Analysis'],['mentor'],'Environmental science senior and student life peer mediator. Active in campus sustainability spaces and open to mentoring newcomers.','moderator'],
  ['admin1','Casey Kim','North Campus',['AI','Robotics','Startups'],['Python','C++','Leadership'],['Design','UI/UX'],['project_mate','mentor'],'Computer engineering grad researcher maintaining campus developer tooling and student open-source repositories.','admin']
].map(([uid,name,campus,interests,teach,learn,lookingFor,bio,role='student']) => ({ uid,id:uid,name,email:`${uid}@campusconnect.test`,campus,interests,teach,learn,lookingFor,bio,photoURL:'',discoverable:true,onboarded:true,role,createdAt:now }))

export const store = {
  users,
  currentUid:null,
  connections:[
    {id:pairId('u2','u1'),fromUid:'u2',toUid:'u1',participants:['u2','u1'],status:'pending',createdAt:now},
    {id:pairId('u1','u3'),fromUid:'u1',toUid:'u3',participants:['u1','u3'],status:'pending',createdAt:now},
    {id:pairId('u1','u5'),fromUid:'u1',toUid:'u5',participants:['u1','u5'],status:'accepted',createdAt:now},
    {id:pairId('u1','u2'),fromUid:'u1',toUid:'u2',participants:['u1','u2'],status:'accepted',createdAt:now},
    {id:pairId('u1','u3'),fromUid:'u1',toUid:'u3',participants:['u1','u3'],status:'accepted',createdAt:now},
    {id:pairId('u1','u4'),fromUid:'u1',toUid:'u4',participants:['u1','u4'],status:'accepted',createdAt:now},
    {id:pairId('u1','u6'),fromUid:'u1',toUid:'u6',participants:['u1','u6'],status:'accepted',createdAt:now},
    // 2nd‑degree bridges
    {id:pairId('u2','u3'),fromUid:'u2',toUid:'u3',participants:['u2','u3'],status:'accepted',createdAt:now},
    {id:pairId('u2','u5'),fromUid:'u2',toUid:'u5',participants:['u2','u5'],status:'accepted',createdAt:now},
    {id:pairId('u3','u4'),fromUid:'u3',toUid:'u4',participants:['u3','u4'],status:'accepted',createdAt:now},
    {id:pairId('u4','u6'),fromUid:'u4',toUid:'u6',participants:['u4','u6'],status:'accepted',createdAt:now},
    {id:pairId('u5','u6'),fromUid:'u5',toUid:'u6',participants:['u5','u6'],status:'accepted',createdAt:now},
    {id:pairId('u2','u7'),fromUid:'u2',toUid:'u7',participants:['u2','u7'],status:'accepted',createdAt:now},
    {id:pairId('u3','u8'),fromUid:'u3',toUid:'u8',participants:['u3','u8'],status:'accepted',createdAt:now},
    {id:pairId('u5','u9'),fromUid:'u5',toUid:'u9',participants:['u5','u9'],status:'accepted',createdAt:now},
    {id:pairId('u6','u10'),fromUid:'u6',toUid:'u10',participants:['u6','u10'],status:'accepted',createdAt:now},
    {id:pairId('u7','u11'),fromUid:'u7',toUid:'u11',participants:['u7','u11'],status:'accepted',createdAt:now},
    {id:pairId('u8','u12'),fromUid:'u8',toUid:'u12',participants:['u8','u12'],status:'accepted',createdAt:now},
    {id:pairId('u9','u13'),fromUid:'u9',toUid:'u13',participants:['u9','u13'],status:'accepted',createdAt:now},
    {id:pairId('u10','u14'),fromUid:'u10',toUid:'u14',participants:['u10','u14'],status:'accepted',createdAt:now},
    {id:pairId('u11','u15'),fromUid:'u11',toUid:'u15',participants:['u11','u15'],status:'accepted',createdAt:now},
    {id:pairId('u12','u16'),fromUid:'u12',toUid:'u16',participants:['u12','u16'],status:'accepted',createdAt:now},
    {id:pairId('u13','u17'),fromUid:'u13',toUid:'u17',participants:['u13','u17'],status:'accepted',createdAt:now},
    {id:pairId('u14','u18'),fromUid:'u14',toUid:'u18',participants:['u14','u18'],status:'accepted',createdAt:now},
    {id:pairId('u15','u19'),fromUid:'u15',toUid:'u19',participants:['u15','u19'],status:'accepted',createdAt:now},
    {id:pairId('u16','u20'),fromUid:'u16',toUid:'u20',participants:['u16','u20'],status:'accepted',createdAt:now}
  ],
  chats:[
    {
      id:pairId('u1','u5'),
      participants:['u1','u5'],
      lastMessage:'See you at the studio!',
      updatedAt:now,
      messages:[
        ['u5','Hey Aanya, are you joining the design jam?'],
        ['u1','Absolutely! I am bringing my Figma ideas.'],
        ['u5','Amazing, see you there!'],
        ['u1','See you at the studio!'],
        ['u5','Can’t wait.'],
        ['u1','Me neither!']
      ].map(([senderUid,text],i)=>({id:`m${i}`,senderUid,text,createdAt:now-(6-i)*60000}))
    }
  ],
  spaces:[
    {
      id:'space1',
      name:'Design Circle',
      description:'A friendly home for designers, UI/UX thinkers, and curious makers.',
      campus:'North Campus',
      createdBy:'u5',
      memberCount:8,
      createdAt:now,
      members:['u1','u3','u5','u8','u9','u13','u17','u19'],
      posts:[
        {
          id:'p1',
          authorName:'Nisha Kumar',
          authorUid:'u5',
          isAnonymous:false,
          text:'Anyone up for a UI critique this Friday?',
          createdAt:now-3600000,
          comments:[{id:'c1',authorName:'Aanya Shah',authorUid:'u1',isAnonymous:false,text:'I would love to join!',createdAt:now-3500000}]
        },
        {
          id:'p2',
          authorName:'Anonymous',
          isAnonymous:true,
          text:'What is your favourite design resource?',
          createdAt:now-7200000,
          comments:[]
        }
      ]
    },
    {
      id:'space2',
      name:'Study Sprint',
      description:'Quiet accountability, shared focus blocks, and practical study help.',
      campus:'North Campus',
      createdBy:'u2',
      memberCount:8,
      createdAt:now,
      members:['u1','u2','u6','u7','u10','u12','u15','u18'],
      posts:[
        {
          id:'p3',
          authorName:'Rohan Mehta',
          authorUid:'u2',
          isAnonymous:false,
          text:'Python study session at 5?',
          createdAt:now-1800000,
          comments:[]
        }
      ]
    },
    {
      id:'space3',
      name:'Late Night Coders',
      description:'Collaborative coding sessions, hackathon project ideation, and tech talks.',
      campus:'North Campus',
      createdBy:'u2',
      memberCount:10,
      createdAt:now,
      members:['u1','u2','u5','u6','u10','u12','u14','u17','u20','admin1'],
      posts:[]
    },
    {
      id:'space4',
      name:'Campus Film & Arts Society',
      description:'Screenings, zine production, visual storytelling, and student showcases.',
      campus:'South Campus',
      createdBy:'u3',
      memberCount:8,
      createdAt:now,
      members:['u3','u4','u5','u8','u11','u13','u16','u19'],
      posts:[]
    },
    {
      id:'space5',
      name:'Campus Founders & Builders',
      description:'For students launching side-projects, indie apps, content, and campus ventures.',
      campus:'North Campus',
      createdBy:'u12',
      memberCount:9,
      createdAt:now,
      members:['u1','u2','u7','u9','u12','u14','u17','u20','mod1'],
      posts:[]
    }
  ],
  reports:[
    {id:'r1',reporterUid:'u1',targetType:'post',targetId:'p2',spaceId:'space1',reason:'Spam',status:'open',createdAt:now},
    {id:'r2',reporterUid:'u2',targetType:'user',targetId:'u4',spaceId:'',reason:'Inappropriate profile',status:'open',createdAt:now}
  ]
}

const listeners = new Set()
export const notify = () => listeners.forEach(fn => fn())
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn) }
export const id = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
export const clone = value => JSON.parse(JSON.stringify(value))
