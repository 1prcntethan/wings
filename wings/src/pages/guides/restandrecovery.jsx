import Footer from "../../components/footer";
import LineDivider from "../../components/line-divider";
import Navbar from "../../components/navbar";
import "./trainingguide.css";

export function RestAndRecovery() {
  return (
    <>
      <Navbar />
      <div className="guide-hero">
        <div className="guide-hero--title">rest & recovery</div>
        <div className="guide-hero--blurb">
          Welcome to the rest & recovery guide from WINGS. This guide will cover
          resting, overtraining, managing fatigue, and deload weeks.
        </div>
      </div>

      <LineDivider />

      <div className="guide-container">
        <div className="guide-heading">rest & recovery</div>

        <div className="guide-text">
          One of the fundamentals of success in calisthenics is rest. Your body
          follows a cycle of stimulus, recovery, and adaptation, which is how
          you grow muscle and increase your strength. Each piece of this is
          equally important, and neglecting rest and recovery will be extremely
          detrimental to your success.
        </div>

        <div className="guide-text">
          Firstly, always try to get 7-8 hours of sleep MINIMUM. The time you
          spend sleeping is when your muscles are going through a repair process
          and getting stronger. The importance of sleep cannot be overstressed,
          because essentially, you are limiting your gains when you skip sleep.
          Even for your overall health, 7-8 hours is optimal to be a physically
          and mentally fit person, so there are no excuses to be skipping
          adequate sleep.
        </div>

        <div className="guide-text">
          Next, diet is arguably one of the most important factors to rest and
          recovery. You must eat good to feel good; you want to be getting all
          the necessary nutrients, proteins, and macros that your body needs for
          it to be able to recover. Ensuring you have a well-balanced diet will
          also boost performance and overall, help you recover faster and
          stronger.
        </div>

        <div className="guide-text">
          Overtraining is another mistake many people make. Ever felt super sore
          in the following days after a workout? This can be both good and bad.
          Soreness does confirm that you have damaged your muscles in order to
          trigger the repair process of getting stronger. However, this isn’t
          actually that good. You do NOT need to feel sore after a workout for
          it to be considered productive. In fact, delayed onset muscle soreness
          (DOMS) indicates that you’ve overworked the muscle by exposing it to a
          stimulus that was too intense. Therefore, you should not be training
          in a way that you are always sore for the next workout.
        </div>

        <div className="guide-text">
          Another consequence of being sore is often not being able to work at
          100% on the next training day. Being sore can affect your performance
          on the sore muscle group, and even affect performance on separate
          muscle groups as well. The best, most efficient workouts, heavily
          stimulate the muscle to cause an increase in muscle growth and
          strength, without causing soreness in the next few days. Instead of
          relying on feeling sore after a workout to track progress, record your
          workouts and see if your volume or intensity is increasing. If it is,
          then you know you’re making progress; and you don’t have to worry
          about soreness affecting your workout performance.
        </div>

        <div className="guide-text">
          Finally, we need to talk about fatigue accumulation. Mostly for
          intermediates, you may find yourself at a plateau at one point or
          another. And one possible reason for this is the buildup of fatigue,
          whether it be in your muscles or your CNS. Regardless, it means that
          your body will not work past a certain intensity, limiting your
          progress.
        </div>

        <div className="guide-text">
          To combat this, we can use deload weeks, where we purposely go down in
          intensity and or volume to allow the body to more adequately recover
          and prevent overtraining. These deload weeks can be taken every 4-6
          weeks, and should replace heavy, intense training, with some active
          recovery, like walking or swimming. A deload week does NOT mean to
          stop training, it is purely to allow the body additional leeway to
          recover. It’s important to note that deload weeks are not required to
          make progress. In fact, if your progress is unstoppable, don’t stop!
          It’s only when you hit a plateau is when you consider a deload week.
        </div>
      </div>

      <Footer />
    </>
  );
}
