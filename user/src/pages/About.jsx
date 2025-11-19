// src/pages/About.jsx
import React from 'react';
import { Clover } from 'lucide-react';
import { MessageCircleQuestion } from 'lucide-react';


const About = () => {
  return (
    
    <div className="relative max-w-3xl mx-auto py-12 px-4">
      <h1 className="relative text-4xl font-semibold mt-14 mb-6 flex items-center gap-3 text-primary">
        {/* <BookOpen className="h-6 w-6 text-primary" /> */}
        About
      </h1>
      
      <div className="relative prose prose-sm prose-zinc dark:prose-invert columns-1 gap-10 pb-6">
        <p className="relative text-muted-foreground leading-relaxed mt-10 mb-4 ">
          <strong className="text-accent text-2xl">Futures of Hope</strong> speaks of the many possibilities that lie ahead,
          <em> guided by hope</em>—imagining <em>countless paths</em> the future might take,
          each carrying the promise of something <strong>beautiful</strong> yet to come.
        </p>
        
      </div>
          
        <h1 className="relative text-2xl font-semibold mt-6 mb-6 flex items-center gap-3 text-primary">
          <Clover className="h-6 w-6 text-primary" />
          What is Futures of Hope?
        </h1>
      <div className="relative prose prose-sm prose-zinc dark:prose-invert columns-2 gap-10 pb-6">      
        <p className="relative text-muted-foreground leading-relaxed mb-4">
          <em>Futures of Hope</em> is a speculative fiction generator that helps to explore 
          infinte preferrable futures through AI-generated stories.
          Speculative fiction gives us a way to imagine what might unfold if 
          we changed the way we think, live, and shape our world differently.
        </p>

        <p className="relative text-muted-foreground leading-relaxed mb-4">
        <em> Futures of Hope</em> invites you to engage playfully with critical questions such as:
        </p>

        <ul className="list-disc text-muted-foreground leading-relaxed mb-4">
          <li>Who holds the power to define progress, and whose voices are left out?</li>
          <br></br>
          <li>What would truly inclusive and equitable communities look like—and how might we get there?</li>
          <br></br>
          <li>What are the long-term consequences of continuing along our current technological, political, and social paths?</li>
        </ul>
        
        <p className="break-before-column relative text-muted-foreground leading-relaxed">
          You begin by selecting values across domains such as politics, technology, 
          social structures, legal systems, economies, and environmental change—parameters 
          that are essential to imagining a future world.
          These inputs form the foundation of the story. The AI then takes these building blocks 
          and weaves them into a rich, speculative narrative.
          <br></br>
          <br></br>
          This is not a one-sided process. It’s a form of co-creation: 
          you define the vision, and the AI responds, integrating your choices into a seamless, 
          unfolding future. 
          <br></br>
          <br></br>
          Each unique combination opens a path to a future that could be more 
          just, resilient, and regenerative—reminding us that imagining better 
          worlds is the first step toward creating them.
        </p>
      </div>

      <h1 className="relative text-2xl font-semibold mt-6 mb-6 flex items-center gap-3 text-primary">
        <MessageCircleQuestion className="h-6 w-6 text-primary" />
        Why we built Futures of Hope?
      </h1>
      <div className="relative prose prose-sm prose-zinc dark:prose-invert columns-2 gap-10 mb-20 border-b pb-10">
        <p className="relative text-muted-foreground leading-relaxed mb-4">
          <em>Futures of Hope</em> was created to help people imagine different futures 
          and reflect more deeply on the world around them. In a time of rapid change—across 
          politics, technology, climate, and society—it invites us to pause and ask:
          where are we headed, and is that the future we truly want? Through AI-generated stories,  
          <em> Futures of Hope</em> encourages critical thinking, sparks new ideas, and opens up space 
          to question the paths we’re on.
        </p>

        <p className="break-before-column relative text-muted-foreground leading-relaxed mb-4">
          It also supports <strong>regeneration culture</strong>—a way of thinking where 
          we don’t just try to fix problems, but try to grow healthier, fairer, and more caring 
          systems for people and the planet. By imagining better futures through these stories, 
          we start to dream of ways to live that are kinder, more just, and full of hope.
        </p>

        
      </div>

      {/* <h1 className="relative text-2xl font-semibold mt-6 mb-6 flex items-center gap-3 text-primary">
        <BadgeInfo className="h-6 w-6 text-primary" />
        About QLO
      </h1> */}
      <div className="relative prose prose-sm prose-zinc dark:prose-invert columns-1 gap-10 mb-10">

        <img
          src="/QLO_logo_color.png"
          alt="Quest Learning Observatory Logo"
          className="w-1/4 object-contain max-h-64 mb-4 dark:hidden"
        />

        {/* Dark mode logo */}
        <img
          src="/QLO_logo_white.png"
          alt="Quest Learning Observatory Logo"
          className="w-1/4 object-contain max-h-64 mb-4 hidden dark:block"
        />
        <p className="relative text-muted-foreground leading-relaxed mb-4">
          The {' '}
          <a
            href="https://questlearningobservatory.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-block relative z-10"
          >
            <em> Quest Learning Observatory (QLO)</em>
          </a>{' '}
          is a visionary space dedicated to crafting a sustainable future.
          QLO draws inspiration from nature and play, serving as a dynamic catalyst for
          collaboration. Here, individuals, youth, educators, leaders, policymakers,
          industry experts, funders, civil society organizations, and community members
          can unite to reimagine, experiment, and co-create regenerative models
          for tomorrow.
        </p>
        
      </div>


    </div>
  );
};

export default About;