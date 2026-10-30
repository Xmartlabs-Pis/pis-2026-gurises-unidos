ALTER TABLE "ProjectBeneficiary" ADD CONSTRAINT "chk_beneficiaries_non_negative"
CHECK (
  "directChildrenAdolescents" >= 0 AND "indirectChildrenAdolescents" >= 0 AND
  "youth18To29" >= 0 AND "families" >= 0 AND "coordinatedInstitutions" >= 0 AND
  "communityLeaders" >= 0 AND "basicServiceStaff" >= 0
);