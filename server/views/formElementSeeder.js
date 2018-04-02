"use strict";
  
module.exports = {
  "up": (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("Forms", [ {
      "name": "myApp",
      "createdAt": new Date(),
      "updatedAt": new Date(),
    } ]).then((results) => {
      // results returns the id of the first row inserted.
      // it's weird, but works. Using it till breaks.
      let formId = results;

      // In case sequelize starts behaving correctly in future, I don't want this
      // code to break.
      if (results.constructor === Array) {
        formId = results[0];
      } else {
        formId = results;
      }

      let formElements = [{"name":"FullName","originalName":"Full Name","section":"PersonalInformation","validationRules":"required"},{"name":"FathersHusbandsName","originalName":"Father's/Husband's Name","section":"PersonalInformation","validationRules":"required"},{"name":"dob","originalName":"dob","section":"PersonalInformation","validationRules":"required|js: verifyDateInddmmyyyy($f.dob)"},{"name":"Age","originalName":"Age","section":"PersonalInformation","validationRules":"required|js: (calcAge($f.dob) + ' Years') === $f.Age"},{"name":"Gender","originalName":"Gender","section":"PersonalInformation","validationRules":"required|in:Male,Female,Transgender,I don&apos;t want to disclose"},{"name":"Category","originalName":"Category","section":"PersonalInformation","validationRules":"required|in:General,Other Backward Classes (OBC),Scheduled Cast (SC),Scheduled Tribe (ST),Person with disabilities"},{"name":"Nationality","originalName":"Nationality","section":"PersonalInformation","validationRules":"required|in:Indian"},{"name":"StateUT","originalName":"State/UT","section":"PersonalInformation","validationRules":"required"},{"name":"MaritalStatus","originalName":"Marital Status","section":"PersonalInformation","validationRules":"required|in:Single,Married,Widowed,Divorced,Separated"},{"name":"PersonwithdisabilityPwD","originalName":"Person with disability (PwD)","section":"PersonalInformation","validationRules":"required|in:Yes,No"},{"name":"MobileNobrwithcountrycode","originalName":"Mobile No.<br>(with country code)","section":"PersonalInformation","validationRules":"required|phone"},{"name":"LandlineNo","originalName":"Landline No.","section":"PersonalInformation","validationRules":"sometimes"},{"name":"CorrespondenceAddress1","originalName":"Correspondence Address1","section":"PersonalInformation","validationRules":"required"},{"name":"PermanentAddress1","originalName":"Permanent Address1","section":"PersonalInformation","validationRules":"required"},{"name":"CorrespondenceAddress2","originalName":"Correspondence Address2","section":"PersonalInformation","validationRules":"required"},{"name":"PermanentAddress2","originalName":"Permanent Address2","section":"PersonalInformation","validationRules":"required"},{"name":"CorrespondenceCity","originalName":"Correspondence City","section":"PersonalInformation","validationRules":"required"},{"name":"PermanentCity","originalName":"Permanent City","section":"PersonalInformation","validationRules":"required"},{"name":"CorrespondenceState","originalName":"Correspondence State","section":"PersonalInformation","validationRules":"required|above:1"},{"name":"PermanentState","originalName":"Permanent State","section":"PersonalInformation","validationRules":"required"},{"name":"CorrespondencePincode","originalName":"Correspondence Pincode","section":"PersonalInformation","validationRules":"required|pincode"},{"name":"PermanentPincode","originalName":"Permanent Pincode","section":"PersonalInformation","validationRules":"required|pincode"},{"name":"DepartmentPreference1","originalName":"Department Preference 1","section":"ApplicationDetails","validationRules":"required|in:Architecture,Civil Engineering,Chemical Engineering,Computer Science Engineering,Electronics and Communication Engineering,Electricals and Electronics Engineering,Instrumentation and Control Engineering,Mechanical Engineering,Metallurgical and Materials Engineering,Production Engineering,Energy and Environment,Physics,Chemistry,Mathematics,Humanities (English/Economics),Computer Application,Management Studies"},{"name":"DepartmentPreference2","originalName":"Department Preference 2","section":"ApplicationDetails","validationRules":"sometimes|in:Architecture,Civil Engineering,Chemical Engineering,Computer Science Engineering,Electronics and Communication Engineering,Electricals and Electronics Engineering,Instrumentation and Control Engineering,Mechanical Engineering,Metallurgical and Materials Engineering,Production Engineering,Energy and Environment,Physics,Chemistry,Mathematics,Humanities (English/Economics),Computer Application,Management Studies"},{"name":"DepartmentPreference3","originalName":"Department Preference 3","section":"ApplicationDetails","validationRules":"sometimes|in:Architecture,Civil Engineering,Chemical Engineering,Computer Science Engineering,Electronics and Communication Engineering,Electricals and Electronics Engineering,Instrumentation and Control Engineering,Mechanical Engineering,Metallurgical and Materials Engineering,Production Engineering,Energy and Environment,Physics,Chemistry,Mathematics,Humanities (English/Economics),Computer Application,Management Studies"},{"name":"Email","originalName":"Email","section":"ApplicationDetails","validationRules":"required"},{"name":"AreaofResearch","originalName":"Area of Research","section":"ApplicationDetails","validationRules":"required"},{"name":"BankReferenceNumber","originalName":"Bank Reference Number","section":"ApplicationDetails","validationRules":"required"},{"name":"ApplicationCategory","originalName":"Application Category","section":"ApplicationDetails","validationRules":"required|in:On campus,External,Stipendary,Non-Stipendary,Project,Other Fellowships"},{"name":"PassportPhoto","originalName":"Passport Photo","section":"ApplicationDetails","validationRules":"requiredFile|fileType:jpeg,jpg,png|fileSize:500|imageMaxHeight:800|imageMaxWidth:800|file"},{"name":"NameofDegree","originalName":"Name of Degree","section":"UndergraduationDetails","validationRules":"required"},{"name":"BranchName","originalName":"Branch Name","section":"UndergraduationDetails","validationRules":"required"},{"name":"CGPA","originalName":"C.G.P.A","section":"UndergraduationDetails","validationRules":"required"},{"name":"Class","originalName":"Class","section":"UndergraduationDetails","validationRules":"required|in:Honours,Distinction,Stipendary,Non-Stipendary"},{"name":"CollegeName","originalName":"College Name","section":"UndergraduationDetails","validationRules":"required"},{"name":"UniversityName","originalName":"University Name","section":"UndergraduationDetails","validationRules":"required"},{"name":"YearofPassing","originalName":"Year of Passing","section":"UndergraduationDetails","validationRules":"required"},{"name":"NameofDegreePG","originalName":"Name of Degree PG","section":"PostgraduationDetails","validationRules":"required"},{"name":"BranchNamePG","originalName":"Branch Name PG","section":"PostgraduationDetails","validationRules":"required"},{"name":"CGPAPG","originalName":"C.G.P.A PG","section":"PostgraduationDetails","validationRules":"required"},{"name":"ClassPG","originalName":"Class PG","section":"PostgraduationDetails","validationRules":"required|in:Honours,Distinction,Stipendary,Non-Stipendary"},{"name":"Finalsem","originalName":"Final sem","section":"PostgraduationDetails","validationRules":"required|in:Yes,No"},{"name":"CollegeNamePG","originalName":"College Name PG","section":"PostgraduationDetails","validationRules":"required"},{"name":"UniversityNamePG","originalName":"University Name PG","section":"PostgraduationDetails","validationRules":"required"},{"name":"YearofPassingPG","originalName":"Year of Passing PG","section":"PostgraduationDetails","validationRules":"required"},{"name":"PGProjectTitle","originalName":"P.G Project Title","section":"PostgraduationDetails","validationRules":"required"},{"name":"Publicationsbox__box__Publications__count__","originalName":"Publicationsbox__box__Publications__count__","section":"PostgraduationDetails","validationRules":"required"},{"name":"Exams","originalName":"Exams","section":"OtherDetails","validationRules":"required|in:Yes,No"},{"name":"Examination","originalName":"Examination","section":"OtherDetails","validationRules":"sometimes|in:GATE,NET,SLET,CSIR,CAT,UGC,NBHM"},{"name":"Score","originalName":"Score","section":"OtherDetails","validationRules":"sometimes"},{"name":"Rank","originalName":"Rank","section":"OtherDetails","validationRules":"sometimes"},{"name":"ValidTill","originalName":"Valid Till","section":"OtherDetails","validationRules":"requiredIfJs: ($f.Exams == 'Yes')|date"},{"name":"Discipline","originalName":"Discipline","section":"OtherDetails","validationRules":"sometimes"},{"name":"Awardsbox__box__AwardsPrizesSportsNCCetc__count__","originalName":"Awardsbox__box__Awards/Prizes/Sports/NCC etc__count__","section":"OtherDetails","validationRules":"required"},{"name":"Experience","originalName":"Experience","section":"ProfessionalExperience","validationRules":"required|in:Yes,No"},{"name":"ProfessionalExperiencebox__box__undefined__count__","originalName":"ProfessionalExperiencebox__box__undefined__count__","section":"ProfessionalExperience","validationRules":"sometimes"},{"name":"ProfessionalExperiencebox__box__PositionHeld__count__","originalName":"ProfessionalExperiencebox__box__Position Held__count__","section":"ProfessionalExperience","validationRules":"sometimes"},{"name":"ProfessionalExperiencebox__box__From__count__","originalName":"ProfessionalExperiencebox__box__From__count__","section":"ProfessionalExperience","validationRules":"required|date"},{"name":"ProfessionalExperiencebox__box__To__count__","originalName":"ProfessionalExperiencebox__box__To__count__","section":"ProfessionalExperience","validationRules":"required|date"},{"name":"Confirmed","originalName":"Confirmed","section":"Submission","validationRules":"required"},{"name":"Signature","originalName":"Signature","section":"Submission","validationRules":"requiredFile|fileType:jpeg,jpg,png|fileSize:250|imageMaxHeight:200|imageMaxWidth:150|file"}];

      formElements = formElements.map(x => {
        x.createdAt = new Date();
        x.updatedAt = new Date();
        x.formId = formId;
        return x;
      });

      return queryInterface.bulkInsert("FormElements", formElements);
    });
  },

  "down": (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("FormElements", null, {});
  },
};
